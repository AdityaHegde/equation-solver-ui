EQN.Eqn = Ember.Object.extend({
  eqnStr : "",
  parsedEqn : "",
  term : null,
  fullStr : Ember.computed.alias("term.fullStr"),

  buildEqn : function() {
    var tokens = EQN.EqnTokens.create({str : this.get("eqnStr")}),
        term = EQN.TermBracket.create({});
    term = term.parse(tokens);
    this.set("term", term);
    this.set("parsedEqn", term.get("fullStr"));
  },

  simplify : function() {
    this.set("term", this.get("term").simplify());
  },
});
