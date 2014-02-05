Utils = Ember.Namespace.create();

Utils.hasMany = function(modelClass) {
  modelClass = modelClass || Ember.Object;
  var ret = function(key, newval) {
    if(Ember.typeOf(modelClass) == 'string') {
      var split = modelClass.split("."), e = window;
      for(var i = 0; i < split.length; i++) {
        e = e[split[i]];
      }
      if(!e) return [];
      modelClass = e;
    }
    if(arguments.length > 1) {
      if(newval.length) {
        for(var i = 0; i < newval.length; i++) {
          if(!(newval[i] instanceof modelClass)) newval.splice(i, 1, modelClass.create(newval[i]));
        }
      }
      return newval;
    }
  }.property();
  return ret;
}

