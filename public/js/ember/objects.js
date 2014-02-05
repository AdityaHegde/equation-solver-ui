EQN.EqnTokens = Ember.Object.extend({
  str : "",
  tokens : function() {
    var str = this.get("str");
    str = str.replace(/\s+/g, " ");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2 $3");
    str = str.replace(/(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)/g, "$1 $2");
    return str.split(" ");
  }.property('str'),
  cur : function() {
    return 0;
  }.property('str'),

  next : function() {
    var cur = this.get("cur"), tokens = this.get("tokens");
    if(cur >= tokens.length) return undefined;
    this.set("cur", cur+1);
    return tokens[cur];
  },

  back : function(amt) {
    var cur = this.get("cur"), tokens = this.get("tokens");
    amt = amt || 1;
    if(cur + amt <= tokens.length) {
      this.set("cur", cur - amt);
    }
  },
});

EQN.Eqn = Ember.Object.extend({
  eqnStr : "",
  term : null,
});

EQN.Term = Ember.Object.extend({
  fullStr : "",
  sortStr : "",
  coeff : 1,
  pwr : 1,
  var : "",

  
});
