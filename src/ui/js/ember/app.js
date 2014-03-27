EQNAPP = Ember.Application.create();

EQNAPP.Router.map(function() {
  this.resource('index', { path : '' }, function() {
    this.resource('problem', { path : ':problem_id' }, function() {
      this.resource('eqns', { path : 'eqns' }, function() {
        this.route('eqn', { path : ':eqn_id/eqn' });
      });
    });
  });
});
