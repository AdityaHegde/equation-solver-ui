EQN = Ember.Application.create();

EQN.Router.map(function() {
  this.resource('index', { path : ':problem_id' }, function() {
    this.resource('eqns', { path : 'eqns' }, function() {
      this.route('eqn', { path : ':eqn_id/eqn' });
    });
  });
});
