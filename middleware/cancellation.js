function cancellationMiddleware(req, res, next) {
  const controller = new AbortController();

  const abort = () => {
    if (!controller.signal.aborted) {
      controller.abort(new Error('Request was cancelled by the client'));
    }
  };

  // Client disconnected before response finished
  res.on('close', () => {
    if (!res.writableEnded) {
      abort();
    }
  });

  // Attach signal to request
  req.abortSignal = controller.signal;

  next();
}

module.exports = { cancellationMiddleware };

// async function getUserDashboard(userId, { signal }) {
//   signal?.throwIfAborted();

//   const profile = await getUserProfile(userId, { signal });
//   const orders  = await getUserOrders(userId, { signal });
//   const stats   = await getUserStats(userId, { signal });

//   return { profile, orders, stats };
// }