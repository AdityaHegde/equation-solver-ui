ListGroup = Ember.Namespace.create();
ListGroup.ListGroup = Ember.View.extend({
  classNames : ['list-group'],

  objects : [],
  listgroupTemplate : "",

  template : Ember.Handlebars.compile('' +
    '{{#each view.objects}}' +
      '{{view ListGroup.ListGroupItem this templateName=view.listgroupTemplate}}' +
    '{{/each}}'),
});
ListGroup.ListGroupItem = Ember.View.extend({
  classNames : ['list-group-item'],

  name : "",
  desc : "",
  rightText : "",
  active : false,
  hasActive : false,
  layout : Ember.Handlebars.compile('' +
    '<h4 class="list-group-item-heading group-item-heading">' +
      '<span class="group-item-name">{{view.name}}</span>' +
      '{{#if view.hasActive}}' +
        '{{view Views.ActiveLabel value=view.active}}' +
      '{{/if}}' +
      '<div class="pull-right">' +
        '{{yield}}' +
      '</div>' +
    '</h4>' +
    '<p class="list-group-item-text">{{view.desc}}</p>'),

  template : Ember.Handlebars.compile('{{view.rightText}}'),
});
