QUnit.config.reorder = false;
emq.globalize();
ROSUI.setupForTesting();
Ember.Test.registerAsyncHelper("fillFormElement",
  function(app, column, inputType, text, context) {
    return fillIn(".ember-view[data-column-name='"+column+"'] "+inputType, text, context);
  }
);

Ember.Test.registerAsyncHelper("scrollHelper",
  function(app, element, scrollVal, context) {
    Ember.run(function() {
      element.scrollTop(scrollVal).change();
    });
  }
);
ROSUI.injectTestHelpers();
setResolver(Ember.DefaultResolver.create({ namespace: ROSUI }))

/*module("Integration Tests", {
  setup: function() {
    Ember.run(ROSUI, ROSUI.advanceReadiness);
  },
  teardown: function() {
  } 
});

test('create new sitegroup', function(){
  visit('/publisher/1/sitegrps');
  click(".create-btn button.btn-primary");
  andThen(function() {
    equal(find("#edit-modal-window .modal-title").text(), "Create Site Group");
  });
  fillFormElement("sitegrp_name", "input", "Test");
  fillFormElement("sitegrp_desc", "textarea", "Test");
  fillFormElement("sites", "textarea", "test.com, test1.com, test2.com, test3.com");
  click("#edit-modal-window .ok-btn");
  andThen(function() {
    equal(find(".page-header .alert-message").text(), "Site Group created successfuly.");
  });
});*/

