EQNAPP.IndexController = Ember.Controller.extend({
  eqnStr : "a+b+b+c*(d+c)",
  parsedEqn : "",
  eqn : null,
  fullStr : Ember.computed.alias("eqn.fullStr"),

  actions : {
    createEqn : function() {
      var eqn = EQN.Eqn.create({eqnStr : this.get("eqnStr")});
      eqn.buildEqn();
      this.set("parsedEqn", eqn.get("parsedEqn"));
      eqn.simplify();
      this.set("eqn", eqn);
    },
  },
});

EQNAPP.EqnsController = Ember.Controller.extend({
});
