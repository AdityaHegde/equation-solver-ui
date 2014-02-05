Collapsible = Ember.Namespace.create();
Collapsible.CollapsibleGroup = Ember.View.extend({
  groupId : '00',
  layout : Ember.Handlebars.compile('<div class="panel-group" {{bind-attr id="view.groupId"}}>{{yield}}</div>'),
});
Collapsible.Collapsible = Ember.View.extend({
  classNames : ['panel', 'panel-default'],
  name : "",
  desc : null,
  hasActive : false,
  active : false,
  badgeLabel : null,
  badgeCount : 0,
  groupId : '00',
  groupIdHref : function() {
    return "#"+this.get("groupId");
  }.property('groupId'),
  collapseId : '0',
  idHref : function() {
    return "#"+this.get("collapseId");
  }.property('collapseId'),
  headerTemplate : null,
  layout : Ember.Handlebars.compile('' +
    '<div class="panel-heading">' +
      '<h4 class="panel-title">' +
        '<div>' +
          '<h4 class="panel-title group-item-heading">' +
            '<a class="group-item-name" data-toggle="collapse" {{bind-attr data-parent="view.groupIdHref" href="view.idHref"}}>{{view.name}}</a>' +
            '{{#if view.hasActive}}' +
              '{{view Views.ActiveLabel value=view.active}}' +
            '{{/if}}' +
            '{{#if view.badgeLabel}}' +
              '<span class="badge pull-right">{{view.badgeLabel}} : {{view.badgeCount}}</span>' +
            '{{/if}}' +
          '</h4>' +
        '</div>' +
        '{{#if view.desc}}' +
          '<div class="group-item-desc">' +
            '{{view.desc}}' +
          '</div>' +
        '{{/if}}' +
      '</h4>' +
    '</div>' +
    '<div {{bind-attr id="view.collapseId"}} class="panel-collapse collapse">' +
      '<div class="panel-body">{{yield}}</div>' +
    '</div>'),
});
