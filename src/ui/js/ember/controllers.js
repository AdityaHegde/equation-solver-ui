EQNAPP.IndexController = Ember.Controller.extend({
  eqnStr : "a+(b+c)*(b-c)",
  parsedEqn : "",
  eqn : null,
  rEqn : null,
  fullStr : Ember.computed.alias("eqn.fullStr"),
  rFullStr : Ember.computed.alias("rEqn.fullStr"),
  rterm : "c",
  wterm : "a+b",

  actions : {
    createEqn : function() {
      var eqn = EQN.Eqn.create({eqnStr : this.get("eqnStr")});
      eqn.buildEqn();
      this.set("parsedEqn", eqn.get("parsedEqn"));
      eqn.simplify();
      this.set("eqn", eqn);
    },

    replaceEqn : function() {
      var rterm = createAndParseTerm(EQN.Term, this.get("rterm")),
          wterm = createAndParseTerm(EQN.TermBracket, this.get("wterm")),
          reqn = this.get("eqn").copy();
      reqn.replace(rterm, wterm);
      reqn.simplify();
      this.set("rEqn", reqn);
    },
  },
});

EQNAPP.EqnsController = Ember.Controller.extend({
});
