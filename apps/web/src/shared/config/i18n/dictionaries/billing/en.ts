/**
 * The organization's plan (ADR 0063, ADR 0067): the plan page, the state the frame says above every screen,
 * and what a limit, a capability or read only means wherever a screen meets one. The catalogue's words
 * (`plans`, `limits`, `capabilities`) follow `billing.ts` in `@repo/contracts`: a product that writes its own
 * catalogue writes their words here.
 */
export const billingEn = {
  billing: {
    title: 'Plan and billing',
    unavailable: 'We could not load the plan. Check your connection, then try again.',
    price: '{{price}} a month',
    limits: {
      'customers.max': { some: 'Up to {{count}} active customers', none: 'Unlimited customers' }
    },
    capabilities: { 'activity-log': 'Activity log' },
    actions: {
      open: 'Open the payment',
      continue: 'Continue to payment'
    },
    current: {
      title: 'Your plan',
      memberTitle: "{{name}}'s plan",
      description: 'What {{name}} pays for, and until when.',
      memberDescription: 'Only an owner of {{name}} can choose, change or pay for the plan.',
      badges: { trial: 'Trial', active: 'Active', late: 'Payment late', readOnly: 'Read only' },
      trial: 'Free trial until {{date}} ({{days}} left).',
      trialEnded: 'The trial ended on {{date}}.',
      paid: '{{price}}. Paid until {{date}}.',
      late: '{{price}}. The payment due on {{due}} was not received.',
      ended: 'The plan ended on {{date}}.',
      endedUndated: 'The plan has ended.'
    },
    checkout: {
      upgrade: 'Upgrade to {{plan}}',
      subscription: 'Subscribe to {{plan}}',
      waiting:
        'Waiting for the payment of {{amount}}. {{plan}} starts as soon as it is confirmed: a card in seconds, Pix in minutes, a boleto in up to three business days.',
      cancelUpgrade: 'Cancel the upgrade',
      cancelSubscription: 'Cancel the payment',
      cancelled: {
        upgrade: 'The upgrade to {{plan}} was cancelled. You are still on {{current}}, and nothing was charged.',
        subscription: 'The payment for {{plan}} was cancelled. Nothing was charged.'
      }
    },
    downgrade: {
      title: 'Changes to {{plan}} on {{date}}',
      description: 'You keep {{current}} until then. Nothing is refunded.',
      keep: 'Keep {{plan}}',
      kept: 'You keep {{plan}}. Nothing changes.'
    },
    end: {
      title: 'Ends on {{date}}',
      description: 'After that the organization is read only. Nothing is deleted.',
      kept: 'Your plan continues. Nothing changes.'
    },
    late: {
      title: 'Payment late',
      checkout:
        'The provider has no page for the late payment, so a new subscription to {{plan}} replaces it: you pay {{price}} now, then every month.',
      pastDue: 'Pay by {{until}} to keep editing. Nothing is deleted.',
      readOnly: 'The organization is read only since {{until}}. Pay to edit again. Nothing was deleted.'
    },
    cancel: {
      action: 'Cancel plan',
      description: 'The plan ends when its paid period ends.',
      message:
        'Your plan stays paid until {{date}}. After that the organization is read only: nothing is deleted, and you can keep the plan until then.',
      messageUndated:
        'The plan ends when its paid period ends. After that the organization is read only: nothing is deleted, and you can keep the plan until then.',
      done: 'Your plan ends when its paid period ends. You can keep it until then.'
    },
    reference: 'Reference for support',
    managers: {
      title: 'Who manages the plan',
      unknown: 'An owner of {{name}}'
    },
    catalogue: {
      title: 'Plans',
      description: 'Choose the plan that fits {{name}}. Prices are per month.',
      memberDescription: 'What each plan includes.',
      current: 'Current plan',
      choose: 'Choose {{plan}}',
      notes: {
        late: 'Pay what is late first.',
        ending: 'Keep the plan first, then change it.',
        open: 'Pay or cancel the open payment first.'
      },
      subscribe: 'You pay {{price}} now, then every month. {{plan}} starts as soon as the payment is confirmed.',
      upgrade:
        'You pay {{amount}} now for what is left of the period ({{days}}); from {{date}}, {{price}} a month. {{plan}} starts as soon as the payment is confirmed.',
      freeUpgrade:
        '{{plan}} starts now. There is nothing to pay for what is left of the period ({{days}}); from {{date}} it costs {{price}} a month.',
      downgrade:
        '{{plan}} starts on {{date}}, when the paid period ends. You keep {{current}} until then, and nothing is refunded.',
      method: 'How to pay',
      methodHint: 'A card is confirmed in seconds, Pix in minutes, a boleto in up to three business days.',
      methods: { card: 'Card', pix: 'Pix', boleto: 'Boleto' },
      change: 'Change to {{plan}}',
      changed: 'You are on {{plan}} now.',
      scheduled: '{{plan}} starts on {{date}}.'
    },
    payer: {
      name: 'Name or company name',
      nameHint: 'The charges are issued to this name.',
      taxId: 'CPF or CNPJ',
      taxIdHint: 'As printed on the document, with or without dots and dashes.',
      email: 'Email for charges',
      emailHint: 'Due dates and late payments are sent here.',
      errors: {
        nameRequired: 'Enter the name the charges are issued to.',
        nameTooLong: 'Use at most {{max}} characters.',
        taxIdInvalid: 'Check the CPF or CNPJ: it is not valid.',
        emailInvalid: 'Enter an email like ana@example.com.'
      }
    },
    returned: {
      waiting: 'Confirming your payment with the provider…',
      confirmed: 'Your payment was confirmed. You are on {{plan}}.',
      late: 'The provider has not confirmed the payment yet. A boleto or Pix can take a while: {{plan}} starts as soon as it arrives, and you can keep working.',
      notPaid: {
        upgrade: 'The upgrade to {{plan}} was not paid. You are still on {{current}}, and nothing was charged.',
        subscription: 'The payment for {{plan}} was not completed. Nothing was charged.'
      },
      cancelled: 'Payment not completed. Nothing was charged.'
    },
    errors: {
      changed: 'The plan changed since this page was read. It shows the latest now: check it, then try again.',
      checkoutOpen: 'A payment is already open for another plan. Pay it or cancel it first.',
      checkoutPaid: 'This payment was already made. The plan changes as soon as the provider confirms it.',
      notActive: 'There is no paid plan to change yet. Choose a plan first.',
      cancellationScheduled: 'The plan is set to end. Keep the plan first, then change it.',
      paymentOverdue: 'A payment is late. Pay it first, then change the plan.',
      wrongDirection: 'The plan changed since this page was read, so this choice works another way now. Choose again.',
      unavailable: 'The payment provider is not answering. Nothing was changed: try again in a moment.',
      notAllowed: 'Only an owner can manage the plan.'
    },
    refusals: {
      capabilities: {
        'activity-log': {
          title: 'The activity log is not in your plan',
          description:
            'It comes with {{plans}}. Activity is recorded on every plan and shows here once the plan includes it.'
        }
      },
      capabilityMember: 'An owner can change the plan.'
    }
  }
}
