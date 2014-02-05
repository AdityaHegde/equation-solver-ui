EditableTable = {};

EditableTable.EditRowView = Ember.ContainerView.extend({
  init : function() {
    this._super();
    var cols = this.get('cols'), row = this.get('row');
    for(var i = 0; i < cols.length; i++) {
      this.pushObject(EditableTable.TypeToCellMap[cols[i].type].create({col : cols[i], row : row}));
    }
  },

  classNames : ['form-horizontal'],
  row : null,
  cols : null,
});

EditableTable.EditCellTextInputView = Ember.View.extend({
  /*init : function() {
    this._super();
    var col = this.get("col"), row = this.get("row");
    Ember.addObserver(row, col.name, this.valueChanged);
  },*/

  template : Ember.Handlebars.compile('' +
    '<div class="form-group">' +
      '<label {{bind-attr for="view.col.name"}} class="col-sm-3 control-label">{{view.col.label}}</label>' +
      '<div class="col-sm-9">' +
        '{{input class="form-control" id=view.col.name type="text" value=view.val disabled=view.col.fixedValue placeholder=view.col.label}}' +
      '</div>' +
    '</div>'),
  col : null,
  row : null,

  /*valueChanged : function() {
    var col = this.get("col"), row = this.get("row");
    this.set("val", row.get(col.name));
  },*/

  //Works as both getter and setter
  val : function(key, value) {
    var col = this.get("col"), row = this.get("row");
    if(value) {
      row.set(col.name, value);
      return value;
    }
    else {
      return row.get(col.name);
    }
  }.property('col', 'row.@each'),
});

EditableTable.EditCellStaticSelectView = EditableTable.EditCellTextInputView.extend({
  template : Ember.Handlebars.compile('' +
    '<div class="form-group">' +
      '<label {{bind-attr for="view.col.name"}} class="col-sm-3 control-label">{{view.col.label}}</label>' +
      '<div class="col-sm-9">' +
        '{{view Ember.Select class="form-control" id=view.col.name content=view.col.options optionValuePath="content.val" optionLabelPath="content.label" ' +
                                                  'prompt="Select" value=view.val disabled=view.col.fixedValue}}' +
      '</div>' +
    '</div>'),
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

  template : Ember.Handlebars.compile('' +
    '<div class="form-group">' +
      '<label {{bind-attr for="view.col.name"}} class="col-sm-3 control-label">{{view.col.label}}</label>' +
      '<div class="col-sm-9">' +
        '{{view Ember.Select class="form-control" id=view.col.name content=view.selectOptions optionValuePath="content.val" optionLabelPath="content.label" '+
                                                  'prompt="Select" value=view.val disabled=view.col.fixedValue}}' +
      '</div>' +
    '</div>'),
});

EditableTable.TypeToCellMap = {
  textInput : EditableTable.EditCellTextInputView,
  staticSelect : EditableTable.EditCellStaticSelectView,
  dynamicSelect : EditableTable.EditCellDynamicSelectView,
};
