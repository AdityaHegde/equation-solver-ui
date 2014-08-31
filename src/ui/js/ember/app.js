EQNAPP = Ember.Application.create();

EQNAPP.Router.map(function() {
  this.resource('index', { path : '' }, function() {
    this.resource('problems');
    this.resource('problem', { path : 'problem/:problem_id' });
  });
});

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

CrudAdapter.loadAdaptor(EQNAPP);
