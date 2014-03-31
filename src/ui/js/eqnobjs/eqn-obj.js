EQN.Eqn = Ember.Object.extend({
  eqnStr : "",
  parsedEqn : "",
  term : null,
  fullStr : Ember.computed.alias("term.fullStr"),

  buildEqn : function() {
    var term = createAndParseTerm(EQN.TermBracket, this.get("eqnStr"));
    this.set("term", term);
    this.set("parsedEqn", term.get("fullStr"));
  },

  simplify : function() {
    this.set("term", this.get("term").simplify());
  },

  replace : function(rterm, wterm) {
    this.set("term", this.get("term").replace(rterm, wterm));
  },

  copy : function() {
    return EQN.Eqn.create({
      eqnStr : this.get("eqnStr"),
      parsedEqn : this.get("parsedEqn"),
      term : this.get("term").copy(),
    });
  },
});
