EQN = Ember.Namespace.create();

EQN.EqnTokens = Ember.Object.extend({
  //primitive tokensizer
  //TODO : implement a proper lexer to parse equations

  init : function() {
    this._super();
    var str = this.get("str");
    str = str.replace(/\s+/g, " ");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2 $3");
    str = str.replace(/(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)/g, "$1 $2");
    this.set("tokens", str.split(" "));
  },
  str : "",
  tokens : [],
  cur : 0,

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

  isEmpty : function() {
    return this.get("cur") >= this.get("tokens").length;
  },
});
