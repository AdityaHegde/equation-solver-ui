ArrayMod = Ember.Namespace.create();

ArrayMod.ArrayModifier = Ember.Object.extend({
  property : "",
  modify : function(array) {
    return array;
  },
});

ArrayMod.ArrayFilterModifier = ArrayMod.ArrayModifier.extend({
  modify : function(array) {
    return array.filter(function(item) {
      var value = item.get(this.get("property"));
      this.filterFunction(item, value);
    }, this);
  },

  filterFunction : function(item, value) {
    return true;
  },
});

ArrayMod.ArraySearchModifier = ArrayMod.ArrayFilterModifier.extend({
  searchString : "",
  negate : false,
  searchRegex : function() {
    return new RegExp(this.get("searchString") || "", "i");
  }.property('searchString'),

  filterFunction : function(item, value) {
    var negate = this.get("negate"), filter = this.get("searchRegex").test(value)
    return (negate && !filter) || (!negate && filter);
  },
});

//TODO : support dynamic tags
ArrayMod.ArrayTagObjectModifier = Ember.Object.extend({
  label : "",
  val : "",
  checked : true,
  negate : false,
});
ArrayMod.ArrayTagSearchModifier = ArrayMod.ArrayFilterModifier.extend({
  tags : Utils.hasMany("ArrayMod.ArrayTagObjectModifier"),
  joiner : "or",

  filterFunction : function(item, value) {
    var tags = this.get("tags"), joiner = this.get("joiner") == "and", bool = joiner;
    tags.forEach(function(tag) {
    for(var i = 0; i < tags.length; i++) {
      var res = value == tags[i];
      bool = (joiner && (bool && res)) || (!joiner && (bool || res));
    }
    return bool;
  }
});

//TODO : revisit the observers addition and deletion
ArrayMod.ArrayModController = Ember.ArrayController.extend({
  init : function() {
    this._super();
    var filterProperties = this.get("filterProperties") || [];
    //convert own properties (if any) to ArrayMod.FilterProperty objects
    this.set("filterProperties", filterProperties);
    Ember.addBeforeObserver(this, "filterProperties.@each", this, "filterPropertiesWillChange");
  },

  filterProperties : Utils.hasMany(ArrayMod.FilterProperty),
  isFiltered : Ember.computed.bool('filterProperties'),

  filterContent : function(content) {
    var filterProperties = this.get('filterProperties');
    filterProperties.forEach(function(filterProperty) {
      content = content.filter(filterProperty.filterValue, filterProperty);
    }, this);
    return content;
  },

  removeAttachedObservers : function(sortOverride, filterOverride) {
    var content = this.get('content'),
        arrangedContent = this.get('arrangedContent'),
        sortProperties = sortOverride || this.get('sortProperties') || [],
        filterProperties = filterOverride || this.get('filterProperties') || [];

    if (content) {
      content.forEach(function(item) {
        if(arrangedContent.contains(item)) {
          sortProperties.forEach(function(sortProperty) {
            Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
          }, this);
        }
        filterProperties.forEach(function(filterProperty) {
          if(filterProperty.filterProperty) Ember.removeObserver(item, filterProperty.filterProperty, this, 'contentItemFilterPropertyDidChange');
        }, this);
      }, this);
    }
  },

  destroy: function() {
    this.removeAttachedObservers();
    return this._super();
  },

  //this is to facilitate changing of the filter property
  filterPropertiesWillChange : function() {
    var filterProperties = this.get('filterProperties') || [];
    filterProperties.forEach(function(item) {
      Ember.removeBeforeObserver(item, 'filterProperty', this, 'filterPropertyWillChange');
    }, this);
  },

  filterPropertiesDidChange : function() {
    this.removeAttachedObservers([]);
    var filterProperties = this.get('filterProperties') || [];
    filterProperties.forEach(function(item) {
      Ember.addBeforeObserver(item, 'filterProperty', this, 'filterPropertyWillChange');
    }, this);
  }.observes('filterProperties.@each'),

  filterPropertyWillChange : function() {
    this.removeAttachedObservers([]);
  },

  arrangedContent: Ember.computed('content', 'sortProperties.@each', 'filterProperties.@each.filterProperty', 'filterProperties.@each.filterRegex', 'filterProperties.@each.filterValues', function(key, value) {
    var content = this.get('content'), retcontent,
        isSorted = this.get('isSorted'),
        sortProperties = this.get('sortProperties'),
        isFiltered = this.get('isFiltered'),
        filterProperties = this.get('filterProperties'),
        self = this, hasContent = content && (content.length > 0 || (content.get && content.get("length") > 0));

    if(hasContent && (isSorted || isFiltered)) {
      retcontent = content.slice();
    }

    if(retcontent && isFiltered) {
      retcontent = this.filterContent(retcontent);
      content.forEach(function(item) {
        filterProperties.forEach(function(filterProperty) {
          if(filterProperty.filterProperty) Ember.addObserver(item, filterProperty.filterProperty, this, 'contentItemFilterPropertyDidChange');
        }, this);
      }, this);
    }

    if(retcontent && isSorted) {
      retcontent.sort(function(item1, item2) {
        return self.orderBy(item1, item2);
      });
      content.forEach(function(item) {
        if(retcontent.contains(item)) {
          sortProperties.forEach(function(sortProperty) {
            Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
          }, this);
        }
      }, this);
    }

    if(retcontent && (isSorted || isFiltered)) {
      return Ember.A(retcontent);
    }

    return Ember.A([]);
  }),

  _contentWillChange: Ember.beforeObserver('content', function() {
    this.removeAttachedObservers();
    this._super();
  }),

  contentArrayWillChange: function(array, idx, removedCount, addedCount) {
    var isSorted = this.get('isSorted'),
        isFiltered = this.get('isFiltered');
    if(isSorted || isFiltered) {
      var arrangedContent = this.get('arrangedContent'),
          removedObjects = array.slice(idx, idx+removedCount),
          sortProperties = this.get('sortProperties'),
          filterProperties = this.get('filterProperties');
      removedObjects.forEach(function(item) {
        if(arrangedContent.contains(item)) {
          arrangedContent.removeObject(item);
          if(isSorted) {
            sortProperties.forEach(function(sortProperty) {
              Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
            }, this);
          }
          if(isFiltered) {
            filterProperties.forEach(function(filterProperty) {
              if(filterProperty.filterProperty) Ember.removeObserver(item, filterProperty.filterProperty, this, 'contentItemFilterPropertyDidChange');
            }, this);
          }
        }
      });
    }
  },

  contentArrayDidChange : function(array, idx, removedCount, addedCount) {
    var isSorted = this.get('isSorted'),
        isFiltered = this.get('isFiltered'),
        sortProperties = this.get('sortProperties'),
        filterProperties = this.get('filterProperties');
    if(isSorted || isFiltered) {
      var arrangedContent = this.get('arrangedContent'),
          addedObjects = array.slice(idx, idx+addedCount);
      if(isFiltered) {
        addedObjects.forEach(function(item) {
          filterProperties.forEach(function(filterProperty) {
            if(filterProperty.filterProperty) Ember.addObserver(item, filterProperty.filterProperty, this, 'contentItemFilterPropertyDidChange');
          }, this);
        }, this);
        addedObjects = this.filterContent(addedObjects);
      }
      addedObjects.forEach(function(item) {
        if(isSorted) {
          this.insertItemSorted(item);
          sortProperties.forEach(function(sortProperty) {
            Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
          }, this);
        }
        else {
          arrangedContent.pushObject(item);
        }
      }, this);
    }
  },

  contentItemFilterPropertyDidChange : function(item) {
    var arrangedContent = this.get('arrangedContent'),
        isSorted = this.get('isSorted'),
        sortProperties = this.get('sortProperties'),
        filterProperties = this.get('filterProperties'),
        isFiltered = true;
    filterProperties.forEach(function(filterProperty) {
      isFiltered = isFiltered && filterProperty.filterValue(item);
    }, this);
    if(arrangedContent.contains(item)) {
      if(!isFiltered) {
        sortProperties.forEach(function(sortProperty) {
          Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
        arrangedContent.removeObject(item);
      }
    }
    else if(isFiltered) {
      sortProperties.forEach(function(sortProperty) {
        Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
      }, this);
      this.insertItemSorted(item);
    }
  },
});

ArrayMod.ArrayModView = Ember.View.extend({
  init : function() {
    this._super();
    var controllerObj = this.get("controllerObj"), innerModel = this.get("innerModel");
    if(controllerObj) {
      var controller = Ember.generateController(this.get("container"), controllerObj, this);
      controller.set("content", innerModel);
      this.set("controller", controller);
    }
  },

  filterHidden : true,

  controllerObj : null,
  innerModel : null,
  typeOptions : [
    {label : "Search by string", value : true},
    {label : "Filter by values", value : false},
  ],
  layout : Ember.Handlebars.compile('' +
    '<div class="form-horizontal col-sm-12">' +
      '<div class="form-group col-sm-3">' +
        '{{#if controller.isSorted}}' +
          '<label class="control-label col-sm-2">Sort</label>' +
          '<div class="col-sm-8">' +
            '{{view EditableTable.EditCellSelectiveSelectView class="form-control input-sm" options=controller.columnData filterColumn="sortable" optionValuePath="content.name" optionLabelPath="content.label" ' +
                                                                       'value=view.sortPropery}}' +
          '</div>' +
          '<a href="javascript:;" class="btn btn-link" {{action "changeSortOrder" target="view"}}><span {{bind-attr class=":glyphicon controller.sortAscending:glyphicon-sort-by-attributes:glyphicon-sort-by-attributes-alt"}}></span></a>' +
        '{{/if}}' +
      '</div>' +
      '<div class="form-group col-sm-5 filter-box">' +
        '{{#if view.hasFilterProperty}}' +
          '<label class="control-label col-sm-2 col-sm-offset-2">Filter</label>' +
          '<div class="col-sm-4">' +
            '{{view EditableTable.EditCellSelectiveSelectView class="form-control input-sm" options=controller.columnData filterColumn="filterable" optionValuePath="content.name" optionLabelPath="content.label" '+
                                                                       'value=view.filterProperty.filterProperty}}' +
          '</div>' +
          '<div class="col-sm-4 filter-container">' +
            '<a class="btn btn-link btn-sm" {{action "showValues" target="view"}}>Values</a>' +
            '<div {{bind-attr class=":filter-options view.filterHidden:filter-options-hidden :well"}}>' +
              '{{#each view.filterProperty.filterValueOptions}}' +
                '<div class="form-group filter-option">' +
                  '<span class="checkbox"><label>{{view Ember.Checkbox checkedBinding="checked"}}{{label}}</label></span>' +
                '</div>' +
              '{{/each}}' +
              '<p></p>' +
              '<button class="btn btn-primary btn-sm" {{action "hideValues" target="view"}}>Hide</button>' +
            '</div>' +
          '</div>' +
        '{{/if}}' +
      '</div>' +
      '<div class="form-group col-sm-4">' +
        '{{#if view.hasSearchProperty}}' +
          '<div class="col-sm-5">' +
            '{{view EditableTable.EditCellSelectiveSelectView class="form-control input-sm" options=controller.columnData filterColumn="searchable" optionValuePath="content.name" optionLabelPath="content.label" '+
                                                                       'value=view.searchProperty.filterProperty}}' +
          '</div>' +
          '<div class="col-sm-7">' +
            '{{input type="text" placeholder="Search" class="form-control input-sm" value=view.searchProperty.filterRegex}}' +
          '</div>' +
        '{{/if}}' +
      '</div>' +
    '</div>' +
    '<div class="clearfix"></div>' +
    '<div>{{yield}}</div>'),

  sortPropery : function(key, value) {
    var controller = this.get("controller");
    if(arguments.length > 1) {
      if(value) controller.set("sortProperties", [value]);
      return value;
    }
    else {
      var sortProperties = controller.get("sortProperties");
      return sortProperties && sortProperties[0];
    }
  }.property(),

  hasSearchProperty : function() {
    var controller = this.get("controller"), filterProperties = controller.get("filterProperties");
    if(!Ember.isEmpty(filterProperties)) {
      for(var i = 0; i < filterProperties.length; i++) {
        if(filterProperties[i].filteredByRegex) {
          this.set("searchProperty", filterProperties[i]);
          return true;
        }
      }
    }
    return false;
  }.property('controller.filterProperties.@each'),
  searchProperty : null,

  hasFilterProperty : function() {
    var controller = this.get("controller"), filterProperties = controller.get("filterProperties");
    if(!Ember.isEmpty(filterProperties)) {
      for(var i = 0; i < filterProperties.length; i++) {
        if(!filterProperties[i].filteredByRegex) {
          this.set("filterProperty", filterProperties[i]);
          var column = controller.get("columnData").findBy('name', filterProperties[i].filterProperty);
          if(column) filterProperties[i].set("filterValueOptions", column.options || []);
          return true;
        }
      }
    }
    return false;
  }.property('controller.filterProperties.@each'),
  filterProperty : null,
  filterPropertyDidChange : function() {
    var controller = this.get("controller"), columnData = controller.get("columnData"),
        filterProperty = this.get("filterProperty"), column = columnData.findBy('filterProperty', filterProperty.filterProperty);
    filterProperty.set("filterValueOptions", column.options || []);
  }.property('view.filterProperty.filterProperty'),

  actions : {
    addFilter : function() {
      var controller = this.get("controller"), filterProps = controller.get("filterProperties"),
          newProp = ArrayMod.FilterProperty.create();
      filterProps.pushObject(newProp);
    },

    changeSortOrder : function() {
      var controller = this.get("controller"), sortAscending = controller.get("sortAscending");
      controller.set("sortAscending", !sortAscending);
    },

    showValues : function() {
      this.set("filterHidden", false);
    },

    hideValues : function() {
      this.set("filterHidden", true);
    },
  },
});
