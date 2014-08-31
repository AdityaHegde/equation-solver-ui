EqnWorker = {
  init : function() {
    var eqnWorker = new Worker("js/eqnobjs/eqn-worker.js");
    eqnWorker.postMessage();
    eqnWorker.addEventListener("message", EqnWorker.callback, false);
    EqnWorker.eqnWorker = eqnWorker;
  },

  callback : function(e) {
    var data = e.data;
    EqnWorker.callbacks[data.id].callback.apply(EqnWorker.callbacks[data.id].callbackContext, data.arguments);
  },

  id : 0,
  callbacks : {},
  invokeWorker : function(context, method, arguments, callback, callbackContext) {
    EqnWorker.callbacks[++EqnWorker.id] = {callback : callback, callbackContext : callbackContext};
    EqnWorker.eqnWorker.postMessage({context : context, method : method, arguments : arguments, id : EqnWorker.id});
  },
};
EqnWorker.init();
