Modal = Ember.Namespace.create();
Modal.ModalContainer = Ember.ContainerView.extend({
  tagName : '',
});
Modal.ModalWindow = Ember.View.extend({
  classNames : ['modal'],
  classNameBindings : ['animate:fade'],
  animate : true,

  attributeBindings : ['titleid:aria-labelledby', 'role', 'zIndex:z-index', 'backdrop:data-backdrop'],
  titleid : "title-id",
  role : 'dialog',
  ariaHidden : true,
  zIndex : 1000,
  backdrop : "true",
  width : "600px",
  widthStyle : function() {
    return "width:"+this.get("width")+";";
  }.property('view.width'),

  title : "Title",
  okLabel : "OK",
  showOk : true,
  cancelLabel : "Cancel",
  showCancel : true,
  layout : Ember.Handlebars.compile('' +
    '<div class="modal-dialog" {{bind-attr style="view.widthStyle"}}>' +
      '<div class="modal-content">' +
        '<div class="modal-header">' +
          '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
          '<h4 class="modal-title" {{bind-attr id="view.titleid"}}>{{view.title}}</h4>' +
        '</div>' +
        '<div class="modal-body">{{yield}}</div>' +
        '<div class="modal-footer">' +
          '{{#if view.showOk}}' +
            '<button type="button" class="btn btn-primary ok-btn" {{action okClicked target="view"}}>{{view.okLabel}}</button>' +
          '{{/if}}' +
          '{{#if view.showCancel}}' +
            '<button type="button" class="btn btn-default cancel-btn" data-dismiss="modal" {{action cancelClicked target="view"}}>{{view.cancelLabel}}</button>' +
          '{{/if}}' +
        '</div>' +
      '</div>' +
    '</div>'),

  onOk : null,
  onCancel : null,
  actionContext : null,
  fromButton : false,

  didInsertElement : function() {
    var onCancel = this.get("onCancel"), context = this.get("actionContext") || this, that = this;
    $(this.get("element")).on("hide.bs.modal", function(e) {
      if(!that.get("fromButton") && onCancel) onCancel.call(context);
      that.set("fromButton", false);
    });
  },

  actions : {
    okClicked : function(event) {
      var onOk = this.get("onOk");
      this.set("fromButton", true);
      if(onOk) onOk.call(this.get("actionContext") || this);
    },

    cancelClicked : function(event) {
      var onCancel = this.get("onCancel");
      //this.set("fromButton", true);
      //if(onCancel) onCancel.call(this.get("actionContext") || this);
    },
  },
});

Modal.AddEditWindow = Modal.ModalWindow.extend({
  columns : [],
  data : null,
  newRecord : true,

  messageLabel : "Saved!",
  message : "Save Failed",
  showAlert : false,
  saveCallback : function() {
  },
  saveCallbackContext : null,
  preSave : function() {
  },

  template : Ember.Handlebars.compile('' +
    '{{#alert-message message=view.message title=view.messageLabel type="error" switchAlert=view.showAlert}}{{/alert-message}}' +
    '{{#if view.ariaHidden}}No data{{else}}{{view EditableTable.EditRowView row=view.data cols=view.columns}}{{/if}}'),

  showModalMesssage : function(message, label) {
    this.set("message", message);
    this.set("messageLabel", label);
    this.set("showAlert", true);
  },

  onOk : function() {
    var data = this.get("data"), saveCallback = this.get("saveCallback"),
        saveCallbackContext = this.get("saveCallbackContext") || this,
        preSave = this.get("preSave"),
        that = this, okbtn = $(".ok-btn", this.get("element"))[0];;
    $(okbtn).attr("disabled", "disabled");
    preSave.call(saveCallbackContext);
    GOTAA.saveRecord(data).then(function(data) {
      saveCallback.call(saveCallbackContext, data);
      $(okbtn).removeAttr("disabled");
    }, function(message) {
      that.showModalMesssage(message, "Error");
      data.rollback();
      var attrs = data._inFlightAttributes;
      data._inFlightAttributes = {};
      for(var f in attrs) {
        data.set(f, attrs[f]);
      }
      GOTAA.backupDataMap = {};
      $(okbtn).removeAttr("disabled");
    });
  },

});
