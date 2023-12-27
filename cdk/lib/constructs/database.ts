import { CfnOutput, Stack, Token } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface DatabaseProps {
  vpc: ec2.IVpc;
  createBastion?: boolean;
}

export class Database extends Construct {
  readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const vpc = props.vpc;

    const cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_05_0 }),
      writer: rds.ClusterInstance.serverlessV2('Writer', {
        enablePerformanceInsights: true,
      }),
      vpc,
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 1,
      vpcSubnets: vpc.selectSubnets({ subnets: vpc.isolatedSubnets.concat(vpc.privateSubnets) }),
      storageEncrypted: true,
    });
    this.cluster = cluster;

    if (props.createBastion ?? true) {
      const host = new ec2.BastionHostLinux(this, 'BastionHost', {
        vpc,
        machineImage: ec2.MachineImage.latestAmazonLinux2023({ cpuType: ec2.AmazonLinuxCpuType.ARM_64 }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
        blockDevices: [
          {
            deviceName: '/dev/sdf',
            volume: ec2.BlockDeviceVolume.ebs(8, {
              encrypted: true,
            }),
          },
        ],
      });
      this.allowInboundAccess(host);

      new CfnOutput(this, 'PortForwardCommand', {
        value: `aws ssm start-session --region ${Stack.of(this).region} --target ${
          host.instanceId
        } --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"portNumber":["${
          cluster.clusterEndpoint.port
        }"], "localPortNumber":["${cluster.clusterEndpoint.port}"], "host": ["${cluster.clusterEndpoint.hostname}"]}'`,
      });
      new CfnOutput(this, 'SshCommand', {
        value: `aws ssm start-session --region ${Stack.of(this).region} --target ${host.instanceId}`,
      });
    }

    new CfnOutput(this, 'DatabaseSecretsCommand', {
      value: `aws secretsmanager get-secret-value --secret-id ${cluster.secret!.secretName} --region ${Stack.of(this).region}`,
    });
  }

  public allowInboundAccess(peer: ec2.IConnectable) {
    this.cluster.connections.allowDefaultPortFrom(peer);
  }

  public getConnectionInfo() {
    const secret = this.cluster.secret!;
    return {
      // We use direct reference for host and port because using only secret here results in failure of refreshing values.
      // Also refer to: https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/369
      host: this.cluster.clusterEndpoint.hostname,
      port: Token.asString(this.cluster.clusterEndpoint.port),
      engine: secret.secretValueFromJson('engine').unsafeUnwrap(),
      // We use the master user only to simplify this sample.
      // You should create a database user with minimal privileges for your application.
      // Also refer to: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.MasterAccounts.html
      username: secret.secretValueFromJson('username').unsafeUnwrap(),
      password: secret.secretValueFromJson('password').unsafeUnwrap(),
    };
  }

  public getLambdaEnvironment(databaseName: string) {
    const conn = this.getConnectionInfo();
    return {
      DATABASE_HOST: conn.host,
      DATABASE_NAME: databaseName,
      DATABASE_USER: conn.username,
      DATABASE_PASSWORD: conn.password,
      DATABASE_ENGINE: conn.engine,
      DATABASE_PORT: conn.port,
      DATABASE_OPTION: '',
    };
  }
}
