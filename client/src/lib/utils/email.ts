/**
 * Format email for a tag request
 * This would be used server-side in a real implementation
 * It's included here as a reference for what the email might contain
 */
export function formatTagRequestEmail(params: {
  newDocentName: string;
  newDocentEmail: string;
  seasonedDocentName: string;
  seasonedDocentEmail: string;
  tagDate: Date;
  tagTimeSlot: string;
}): { subject: string; body: string } {
  const { 
    newDocentName, 
    newDocentEmail, 
    seasonedDocentName, 
    seasonedDocentEmail, 
    tagDate, 
    tagTimeSlot 
  } = params;
  
  const formattedDate = tagDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const subject = `SF Zoo Tag-Along Scheduled: ${formattedDate} (${tagTimeSlot})`;
  
  const body = `
Hello ${newDocentName} and ${seasonedDocentName},

A tag-along has been scheduled for:

Date: ${formattedDate}
Time: ${tagTimeSlot}

New Docent: ${newDocentName} (${newDocentEmail})
Seasoned Docent: ${seasonedDocentName} (${seasonedDocentEmail})

Please communicate directly to agree on a specific meeting time and location within the Zoo.

If you need to cancel or reschedule, please do so at least 24 hours in advance through the SF Zoo Docent Matching app.

Thank you for your participation in the docent program!

Best regards,
SF Zoo Docent Program Coordinator
`;

  return { subject, body };
}

/**
 * Format email for a password reset request
 */
export function formatPasswordResetEmail(params: {
  name: string;
  resetLink: string;
}): { subject: string; body: string } {
  const { name, resetLink } = params;
  
  const subject = "SF Zoo Docent Matching - Password Reset";
  
  const body = `
Hello ${name},

You (or someone else) has requested a password reset for your SF Zoo Docent Matching account.

To reset your password, please click on the link below:

${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.

Best regards,
SF Zoo Docent Program Coordinator
`;

  return { subject, body };
}

/**
 * Format email for a new user account
 */
export function formatNewUserEmail(params: {
  name: string;
  email: string;
  setupLink: string;
}): { subject: string; body: string } {
  const { name, email, setupLink } = params;
  
  const subject = "Welcome to SF Zoo Docent Matching";
  
  const body = `
Hello ${name},

Welcome to the SF Zoo Docent Matching system!

An account has been created for you with the following email address:
${email}

To set up your password and complete your registration, please click on the link below:

${setupLink}

This link will expire in 24 hours.

If you have any questions, please contact the docent program coordinator.

Best regards,
SF Zoo Docent Program Coordinator
`;

  return { subject, body };
}
