EQNAPP.IndexController = Ember.Controller.extend({
});

EQNAPP.ProblemController = Ember.Controller.extend({
  actions : {
    addEqn : function() {
      var eqns = this.get("model.eqns");
      eqns.pushObject(this.store.createRecord("eqn"));
    },

    removeEqn : function(eqn) {
      var eqns = this.get("model.eqns");
      eqns.removeObject(eqn);
      eqn.unloadRecord();
    },

    simplify : function() {
      var model = this.get("model");
      model.buildEqns();
      model.simplify();
    },

    factorize : function() {
      var model = this.get("model");
      model.buildEqns();
      model.simplify(1);
    },
  },
});
