Views = Ember.Namespace.create();
Views.ActiveLabelMap = {
  0 : ['Disabled', 'label-danger'],
  1 : ['Enabled', 'label-primary'],
  2 : ['Test', 'label-warning'],
  3 : ['Disabled', 'label-danger'],
};
Views.ActiveLabel = Ember.View.extend({
  classNameBindings : ['labelClass', 'labelClassColor'],
  value : "",
  tagName : 'span',
  label : function() {
    return Views.ActiveLabelMap[this.get("value")][0];
  }.property('value'),
  labelClass : 'label',
  labelClassColor : function() {
    return Views.ActiveLabelMap[this.get("value")][1];
  }.property('value'),
  template : Ember.Handlebars.compile('{{view.label}}'),
});

Views.AlertTypeMap = {
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
Views.Alert = Ember.View.extend({
  type : 'error',
  typeData : function() {
    var type = this.get("type");
    return Views.AlertTypeMap[type] || Views.AlertTypeMap.error;
  }.property('view.type', 'type'),
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
    '<div {{bind-attr class=":alert view.typeData.alertClass :alert-dismissable"}}>' +
      '<button class="close" {{action "dismissed" target="view"}}>&times;</button>' +
      '<strong><span {{bind-attr class=":glyphicon view.typeData.glyphiconClass :btn-sm"}}></span> {{view.title}}</strong> {{view.message}}' +
    '</div>' +
  '{{/if}}'),
});

Views.TemplateIntegrator = Ember.View.extend({
  tmplname : "",
  adsize : "",
  slotId : "slot",

  didInsertElement : function() {
    ROSUI.TemplateSelectionMaster.createAdSlot(this.get("element"), this.get("slotId"));
    ROSUI.TemplateSelectionMaster.updateTemplates(this.get("slotId"), "SSAdUnit", this.get("adsize"), this.get("tmplname"));
  },

  willDestroyElement : function() {
    ROSUI.TemplateSelectionMaster.deleteSlot(this.get("slotId"));
  },
});

Views.SelectiveSelect = Ember.Select.extend({
  options : [],
  filterColumn : "",
  content : function() {
    var filterColumn = this.get("filterColumn");
    return this.get("options").filter(function(item) {
      return !Ember.isEmpty(item.get(this.filterColumn));
    }, {filterColumn : filterColumn});
  }.property('view.overallOptions.@each'),
});
