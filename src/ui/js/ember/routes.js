EQNAPP.IndexRoute = Ember.Route.extend({
  model : function(params) {
    return this.store.findById("profile", "1234");
  },

  afterModel : function(model) {
    Ember.set("EQNAPP.CurProfile", model);
  },
});

EQNAPP.ProblemsRoute = Ember.Route.extend({
  model : function(params) {
    return Ember.get("EQNAPP.CurProfile");
  },
});

EQNAPP.ProblemRoute = Ember.Route.extend({
  model : function(params) {
    return this.store.createRecord("problem");
  },
});
