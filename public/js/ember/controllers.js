EQN.IndexController = Ember.Controller.extend({
  eqnStr : "a+b+b+c*d",
  parsedEqn : "",
  eqn : null,

  actions : {
    createEqn : function() {
      var eqn = EQN.Eqn.create({eqnStr : this.get("eqnStr")});
      eqn.buildEqn();
      this.set("parsedEqn", eqn.get("parsedEqn"));
    },
  },
});

EQN.EqnsController = Ember.Controller.extend({
});
