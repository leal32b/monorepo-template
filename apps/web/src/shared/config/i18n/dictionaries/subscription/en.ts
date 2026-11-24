/**
 * The words of the plan that every screen of an organization can draw: the frame's notice and what a limit
 * or read only refuses (ADR 0063, ADR 0079). The rest of the plan's texts are `billing`, which loads with the
 * plan page.
 */
export const subscriptionEn = {
  subscription: {
    plans: { basic: 'Basic', pro: 'Pro' },
    trial: 'Trial',
    actions: { plans: 'See plans', pay: 'Pay now', keep: 'Keep the plan' },
    limitReached: {
      'customers.max': {
        owner:
          'Your plan allows {{limit}} active customers. Choose a larger plan, or archive customers you no longer serve.',
        upgrading:
          'Your plan allows {{limit}} active customers. The upgrade to {{plan}} starts when its payment is confirmed.',
        member:
          "This organization's plan allows {{limit}} active customers. Archiving customers you no longer serve frees room; an owner can choose a larger plan."
      }
    },
    readOnly: {
      owner: 'The organization is read only until a plan is paid. Nothing was deleted.',
      member: 'This organization is read only until an owner pays. You can still view everything.',
      note: 'Read only until the plan is paid'
    },
    notice: {
      owner: {
        trialEnding:
          'Your trial ends on {{date}}. Choose a plan to keep adding and changing records. Nothing is deleted.',
        trialEnded:
          'Your trial ended on {{date}}. The organization is read only: everyone can view and delete, nobody can add or change. Choose a plan to edit again. Nothing was deleted.',
        endScheduled: 'Your plan ends on {{date}}. After that the organization is read only.',
        pastDue:
          'We have not received the payment due on {{due}}. Pay by {{until}} to keep editing. Nothing is deleted.',
        pastDueReadOnly:
          'The organization is read only since {{until}} because the payment due on {{due}} was not received. Pay to edit again. Nothing was deleted.',
        ended:
          'Your plan ended on {{date}}. The organization is read only. Choose a plan to edit again. Nothing was deleted.',
        endedUndated:
          'Your plan has ended. The organization is read only. Choose a plan to edit again. Nothing was deleted.'
      },
      member: {
        trialEnding:
          "This organization's trial ends on {{date}}. After that it is read only until an owner chooses a plan.",
        trialEnded:
          'This organization is read only since {{date}}, until an owner chooses a plan. You can still view everything.',
        endScheduled: "This organization's plan ends on {{date}}. After that it is read only.",
        pastDue: "This organization's payment is late. From {{until}} it is read only until an owner pays.",
        pastDueReadOnly:
          'This organization is read only since {{until}}, until an owner pays. You can still view everything.',
        ended:
          'This organization is read only since {{date}}, until an owner chooses a plan. You can still view everything.',
        endedUndated: 'This organization is read only until an owner chooses a plan. You can still view everything.'
      }
    }
  }
}
