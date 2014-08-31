Alerts = Ember.Namespace.create();
Alerts.AlertTypeMap = {
  info : {
    alertClass : 'alert-info',
    glyphiconClass : 'glyphicon-info-sign',
  },
  success : {
    alertClass : 'alert-success',
    glyphiconClass : 'glyphicon-ok-sign',
  },
  warning : {
    alertClass : 'alert-warning',
    glyphiconClass : 'glyphicon-warning-sign',
  },
  error : {
    alertClass : 'alert-danger',
    glyphiconClass : 'glyphicon-exclamation-sign',
  },
};
Alerts.AlertMessage = Ember.Component.extend({
  type : 'error',
  typeData : function() {
    var type = this.get("type");
    return Alerts.AlertTypeMap[type] || Alerts.AlertTypeMap.error;
  }.property('type'),
  title : "",
  message : "",
  switchAlert : false,

  click : function(event) {
    if($(event.target).filter('button.close').length > 0) {
      this.set("switchAlert", false);
    }
  },

  template : Ember.Handlebars.compile('' +
  '{{#if switchAlert}}' +
    '<div {{bind-attr class=":alert typeData.alertClass :alert-dismissable"}}>' +
      '<button class="close" {{action "dismissed"}}>&times;</button>' +
      '<strong><span {{bind-attr class=":glyphicon typeData.glyphiconClass :btn-sm"}}></span> {{title}}</strong> {{message}}' +
    '</div>' +
  '{{/if}}'),
});

Ember.Handlebars.helper('alert-message', Alerts.AlertMessage);
