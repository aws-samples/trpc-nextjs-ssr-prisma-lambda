import * as cdk from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Database } from './constructs/database';
import { WebApp } from './constructs/webapp';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, `Vpc`, {
    });

    const database = new Database(this, `Database`, { vpc });

    const webapp = new WebApp(this, 'WebApp', {
      database,
    });
  }
}
