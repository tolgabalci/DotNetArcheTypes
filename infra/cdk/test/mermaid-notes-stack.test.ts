import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { MermaidNotesStack } from '../lib/mermaid-notes-stack';

describe('MermaidNotesStack', () => {
  it('creates the core production-shaped resources', () => {
    const app = new cdk.App();
    const stack = new MermaidNotesStack(app, 'TestStack', {
      stageName: 'staging',
      githubOwner: 'example',
      githubRepo: 'mermaid-notes',
      webAllowedOrigins: ['http://localhost:5173'],
      callbackUrls: ['http://localhost:5173'],
      logoutUrls: ['http://localhost:5173'],
      cognitoDomainPrefix: 'mermaid-notes-test',
      env: { account: '111111111111', region: 'us-east-1' }
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.resourceCountIs('AWS::ECS::Cluster', 1);
    template.resourceCountIs('AWS::RDS::DBInstance', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });
});
