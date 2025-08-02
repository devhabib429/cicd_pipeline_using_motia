exports.config = {
  type: 'api',
  name: 'ReceiveWebhook',
  path: '/webhook',
  method: 'POST',
  emits: ['code-pushed'],
  flows: ['cicd-flow'],
};

exports.handler = async (context) => {
  const { body } = context.req;
  if (!body || !body.ref || body.ref !== 'refs/heads/main') {
    return { status: 'Ignored, not main branch' };
  }
  await context.emit('code-pushed', { commit: body.head_commit.id });
  return { status: 'Webhook received', commit: body.head_commit.id };
};
