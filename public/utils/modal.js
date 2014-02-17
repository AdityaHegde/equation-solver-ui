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

  actions : {
    okClicked : function(event) {
      var onOk = this.get("onOk");
      if(onOk) this.onOk.call(this.get("actionContext") || this);
    },

    cancelClicked : function(event) {
      var onCancel = this.get("onCancel");
      if(onCancel) this.onCancel.call(this.get("actionContext") || this);
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
  saveCallback : null,

  template : Ember.Handlebars.compile('' +
    '{{view Views.Alert message=view.message title=view.messageLabel type="error" switchAlert=view.showAlert}}' +
    '{{#if view.ariaHidden}}No data{{else}}{{view EditableTable.EditRowView row=view.data cols=view.columns}}{{/if}}'),

  showModalMesssage : function(message) {
    this.set("message", message);
    this.set("showAlert", true);
  },

  onOk : function() {
    var data = this.get("data"), that = this;
    if(data.get("validationFailed")) {
      that.showModalMesssage("Validations Failed");
    }
    else {
      var okbtn = $(".ok-btn", this.get("element"))[0];
      $(okbtn).attr("disabled", "disabled");
      Utils.saveRecord(data).then(function(response) {
        baseData.showMessage("Saved successfully!", that.get("messageLabel"), 'success'); 
        //TODO : customize that!!!
        $("#edit-modal-window").modal('hide');
        that.set("showAlert", false);
        that.set("ariaHidden", true);
        $(okbtn).removeAttr("disabled");
        if(that.get("newRecord") && that.get("saveCallback")) that.get("saveCallback")(data);
      }, function(response) {
        that.showModalMesssage("Save Failed");
        $(okbtn).removeAttr("disabled");
      });
    }
  },

  onCancel : function() {
    this.set("showAlert", false);
    this.set("ariaHidden", true);
    if(this.get("newRecord")) this.get("data").deleteRecord();
    else this.get("data").rollback();
  },
});
