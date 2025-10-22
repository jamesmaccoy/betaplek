import type { RequiredDataFromCollectionSlug } from 'payload'

const confirmationMessage = {
  root: {
    type: 'root',
    children: [
      {
        type: 'heading',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Thank you for your submission!',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: 'h2',
        version: 1,
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'We have received your form submission and will get back to you soon.',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
}

export const testFormWithDatePicker: RequiredDataFromCollectionSlug<'forms'> = {
  confirmationMessage,
  confirmationType: 'message',
  emails: [
    {
      emailTo: 'test@example.com',
      emailFrom: 'noreply@example.com',
      subject: "You've received a new form submission with date picker.",
    },
  ],
  fields: [
    {
      name: 'full-name',
      blockName: 'full-name',
      blockType: 'text',
      label: 'Full Name',
      required: true,
      width: 100,
    },
    {
      name: 'email',
      blockName: 'email',
      blockType: 'email',
      label: 'Email',
      required: true,
      width: 100,
    },
    {
      name: 'event-date',
      blockName: 'event-date',
      blockType: 'datePicker',
      label: 'Event Date',
      required: true,
      width: 100,
      maxDays: 30,
    },
    {
      name: 'message',
      blockName: 'message',
      blockType: 'textarea',
      label: 'Message',
      required: true,
      width: 100,
    },
  ],
  redirect: undefined,
  submitButtonLabel: 'Submit',
  title: 'Test Form with Date Picker',
  updatedAt: '2023-01-12T21:47:41.374Z',
}
