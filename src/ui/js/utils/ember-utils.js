Utils = Ember.Namespace.create();

Utils.deepSearchArray = function(d, e, k, ak) { //d - data, e - element, k - key, ak - array key
  if(e === undefined || e === null) return false;
  if(d[k] === e) return true;
  if(d[ak]) {
    for(var i = 0; i < d[ak].length; i++) {
      if(Utils.deepSearchArray(d[ak][i], e, k, ak)) return true;
    }
  }
  return false;
}

Utils.hasMany = function(modelClass) {
  modelClass = modelClass || Ember.Object;
  var ret = function(key, newval) {
    if(Ember.typeOf(modelClass) == 'string') {
      var split = modelClass.split("."), e = window;
      for(var i = 0; i < split.length; i++) {
        e = e[split[i]];
      }
      if(!e) return Ember.A([]);
      modelClass = e;
    }
    if(arguments.length > 1) {
      if(newval && newval.length) {
        for(var i = 0; i < newval.length; i++) {
          if(!(newval[i] instanceof modelClass)) newval.splice(i, 1, modelClass.create(newval[i]));
        }
        return newval;
      }
      return Ember.A([]);
    }
  }.property();
  return ret;
}

Utils.recursivelyEmberify = function(obj) {
  if(Ember.typeOf(obj) === 'object' || Ember.typeOf(obj) === 'array') {
    for(var k in obj) {
      if(obj.hasOwnProperty(k)) obj[k] = recursivelyEmberify(obj[k]);
    }
    return Ember.Object.create(obj);
  }
  else if(Ember.typeOf(obj) === 'array') {
    for(var i = 0; i < obj.length; i++) {
      obj[i] = recursivelyEmberify(obj[i]);
    }
    return Ember.MutableArray.create(obj);
  }
  return obj;
}
