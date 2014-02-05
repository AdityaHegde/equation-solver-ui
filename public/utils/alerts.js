Alerts = Ember.Namespace.create();

Alerts.AlertTypeMap = {
  info : 'info',
  success : 'success',
  warning : 'warning',
  error : 'danger',
};
Alerts.Alert = Ember.View.extend({
  type : 'error',
  typeClass : function() {
    var type = this.get("type");
    type = Views.AlertTypeMap[type] || 'error';
    return "alert alert-"+type+" alert-dismissable";
  }.property('view.type'),
  title : "",
  message : "",
  switchAlert : false,

  click : function(event) {
    if($(event.target).filter('button.close').length > 0) {
      this.set("switchAlert", false);
    }
  },

  template : Ember.Handlebars.compile('' +
  '{{#if view.switchAlert}}' +
    '<div {{bind-attr class="view.typeClass"}}>' +
      '<button class="close" {{action "dismissed" target="view"}}>&times;</button>' +
      '<strong>{{view.title}}</strong> {{view.message}}' +
    '</div>' +
  '{{/if}}'),
});
