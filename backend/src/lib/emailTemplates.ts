export const EMAIL_TEMPLATE_NAMES = [
  'verifyEmail',
  'resetPassword',
  'passwordChanged',
  'teamInvite',
  'responseReceived',
  'webhookFailed',
] as const;

export type EmailTemplateName = (typeof EMAIL_TEMPLATE_NAMES)[number];

export interface EmailTemplateVariables {
  verifyEmail: {
    name: string;
    verificationOtp: string;
    expiresIn: string;
  };
  resetPassword: {
    name: string;
    resetUrl: string;
  };
  passwordChanged: {
    name: string;
  };
  teamInvite: {
    inviterName: string;
    acceptUrl: string;
  };
  responseReceived: {
    formTitle: string;
    responseLink: string;
  };
  webhookFailed: {
    name: string;
    webhookUrl: string;
    failureCount: number;
  };
}

export type EmailJobData = {
  [TemplateName in EmailTemplateName]: {
    to: string;
    subject: string;
    template: TemplateName;
    variables: EmailTemplateVariables[TemplateName];
  };
}[EmailTemplateName];

export const EMAIL_TEMPLATE_REQUIRED_VARIABLES: {
  [TemplateName in EmailTemplateName]: Array<keyof EmailTemplateVariables[TemplateName]>;
} = {
  verifyEmail: ['name', 'verificationOtp', 'expiresIn'],
  resetPassword: ['name', 'resetUrl'],
  passwordChanged: ['name'],
  teamInvite: ['inviterName', 'acceptUrl'],
  responseReceived: ['formTitle', 'responseLink'],
  webhookFailed: ['name', 'webhookUrl', 'failureCount'],
};
