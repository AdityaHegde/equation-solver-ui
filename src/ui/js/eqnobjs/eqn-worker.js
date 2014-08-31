importScripts("eqn-gen.js", "eqn-term.js", "eqn-bracket-term.js", "eqn-multiply-term.js", "../utils/eqn-utils.js");

var deepLookupKeys = ["terms"];
function recursivelyRectify(data) {
  for(var i = 0; i < deepLookupKeys.length; i++) {
    if(data[deepLookupKeys[i]]) {
      for(var j = 0; j < data[deepLookupKeys[i]].length; j++) {
        data[deepLookupKeys[i]][j] = recursivelyRectify(data[deepLookupKeys[i]][j]);
      }
    }
  }
  return new self[data.key](data);
}

self.addEventListener('message', function(e) {
  var data = e.data;
  if(data) {
    var instance = recursivelyRectify(data.context);
        retData = instance[data.method].apply(instance, data.arguments);
    self.postMessage({
      id : data.id,
      context : data.context,
      arguments : [retData],
    });
  }
});
