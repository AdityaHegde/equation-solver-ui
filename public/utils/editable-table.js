EditableTable = {};

EditableTable.EditRowView = Ember.ContainerView.extend({
  init : function() {
    this._super();
    var cols = this.get('cols'), row = this.get('row');
    for(var i = 0; i < cols.length; i++) {
      this.pushObject(EditableTable.TypeToCellMap[cols[i].type].create({
        col : cols[i],
        row : row,
        labelWidthClass : this.get("labelWidthClass"),
        inputWidthClass : this.get("inputWidthClass"),
        tagName : this.get("childTagNames"),
        showLabel : this.get("showLabel"),
      }));
    }
  },

  childTagNames : 'div',
  classNames : ['form-horizontal'],
  row : null,
  cols : null,
  labelWidthClass : "col-sm-3",
  inputWidthClass : "col-sm-9",
  showLabel : true,
});

EditableTable.EditCellTextInputView = Ember.View.extend({
  layout : Ember.Handlebars.compile('' +
    '{{#if view.showLabel}}<label {{bind-attr for="view.col.name" class="view.labelClass"}}>{{view.col.label}}{{#if view.col.mandatory}}*{{/if}}</label>{{/if}}' +
    '<div {{bind-attr class="view.inputClass"}}>' +
      '{{yield}}' +
      '{{#if view.invalid}}' +
        '<span class="glyphicon glyphicon-remove form-control-feedback"></span>' +
        '{{#if view.invalidReason}}<span class="help-block text-danger">{{view.invalidReason}}</span>{{/if}}' +
      '{{/if}}' +
    '</div>'),
  template : Ember.Handlebars.compile('{{input class="form-control" type="text" value=view.val disabled=view.col.fixedValue placeholder=view.col.label}}'),
  classNames : ['form-group'],
  classNameBindings : ['invalid:has-error has-feedback'],
  col : null,
  row : null,
  labelWidthClass : "col-sm-3",
  inputWidthClass : "col-sm-9",
  showLabel : true,
  labelClass : function() {
    var col = this.get("col"), labelWidthClass = this.get("labelWidthClass");
    return "control-label "+(col.labelWidthClass || labelWidthClass);
  }.property('view.col', 'view.labelWidthClass'),
  inputClass : function() {
    var col = this.get("col"), inputWidthClass = this.get("inputWidthClass");
    return "control-input "+(col.inputWidthClass || inputWidthClass);
  }.property('view.col', 'view.inputWidthClass'),

  invalid : false,
  invalidReason : false,

  //Works as both getter and setter
  val : function(key, value) {
    var col = this.get("col"), row = this.get("row");
    if(arguments.length > 1) {
      if(col.get("validate")) {
        var validVal = col.validateValue(value);
        if(validVal[0]) row.set("validationFailed", true);
        else row.set("validationFailed", false);
        this.set("invalid", validVal[0]);
        this.set("invalidReason", !Ember.isEmpty(validVal[1]) && validVal[1]);
      }
      row.set(col.name, value);
      return value;
    }
    else {
      value = row.get(col.name);
      if(col.get("validate")) {
        var validVal = col.validateValue(value);
        if(validVal[0]) row.set("validationFailed", true);
        else row.set("validationFailed", false);
        this.set("invalid", validVal[0]);
        this.set("invalidReason", !Ember.isEmpty(validVal[1]) && validVal[1]);
      }
      return value;
    }
  }.property('col', 'row.@each'),
});

EditableTable.EditCellTextAreaView = EditableTable.EditCellTextInputView.extend({
  template : Ember.Handlebars.compile('{{textarea class="form-control" value=view.val disabled=view.col.fixedValue placeholder=view.col.label}}'),
});

EditableTable.EditCellStaticSelectView = EditableTable.EditCellTextInputView.extend({
  template : Ember.Handlebars.compile('{{view Ember.Select class="form-control" content=view.col.options optionValuePath="content.val" optionLabelPath="content.label" ' +
                                                                               'prompt=view.col.prompt value=view.val disabled=view.col.fixedValue}}'),
});

//psuedo dynamic : takes options from records
EditableTable.EditCellDynamicSelectView = EditableTable.EditCellTextInputView.extend({
  selectOptions : function() {
    var col = this.get("col"), opts = [];
    col.data.forEach(function(item) {
      opts.push({ val : item.get(col.dataValCol), label : item.get(col.dataLabelCol)});
    }, this);
    return opts;
  }.property('view.col'),

  template : Ember.Handlebars.compile('{{view Ember.Select class="form-control" content=view.selectOptions optionValuePath="content.val" optionLabelPath="content.label" '+
                                                                               'prompt=view.col.prompt value=view.val disabled=view.col.fixedValue}}'),
});

EditableTable.TypeToCellMap = {
  textInput : EditableTable.EditCellTextInputView,
  textareaInput : EditableTable.EditCellTextAreaView,
  staticSelect : EditableTable.EditCellStaticSelectView,
  dynamicSelect : EditableTable.EditCellDynamicSelectView,
};
