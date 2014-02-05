SortFilter = Ember.Namespace.create();
SortFilter.FilterProperty = Ember.Object.extend({
  property : null,
  filterRegex : null,
  regexObject : function() {
    return new RegExp(this.get("filterRegex"), "i");
  }.property('filterRegex'),
  filteredByRegex : Ember.computed.bool('filterRegex'),
  filterValues : null,
  filterJoiner : "or",
  filteredByValues : Ember.computed.bool('filterValues'),
});

SortFilter.SortFilterMixin = Ember.Mixin.create(Ember.SortableMixin, {
  filterProperties : Utils.hasMany(Ember.FilterProperty),
  isFiltered : Ember.computed.bool('filterProperties'),

  filterContent : function(content) {
    var filterProperties = this.get('filterProperties');
    filterProperties.forEach(function(filterProperty) {
      if(filterProperty.filteredByRegex) {
        content = content.filter(function(e, i, a) {
          return regex.test(e.get(filterProperty.property));
        }, this);
      }
      else if(filterProperty.filteredByValues) {
        var filterJoiner = filterProperty.filterJoiner != 'or';
        content = content.filter(function(e, i, a) {
          var bool = filterJoiner, prop = e.get(filterProperty.property);
          filterProperty.filterValues.forEach(function(item) {
            var res = prop == item;
            bool = (filterJoiner && (bool && res)) || (!filterJoiner && (bool || res));
          }, this);
          return bool;
        }, this);
      }
    }, this);
    return content;
  },

  removeAttachedObservers : function() {
    var content = this.get('content'),
        arrangedContent = this.get('arrangedContent'),
        sortProperties = this.get('sortProperties') || [],
        filterProperties = this.get('filterProperties') || [];

    if (content) {
      content.forEach(function(item) {
        if(arrangedContent.contains(item)) {
          sortProperties.forEach(function(sortProperty) {
            Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
          }, this);
        }
        filterProperties.forEach(function(filterProperty) {
          Ember.removeObserver(item, filterProperty.property, this, 'contentItemFilterPropertyDidChange');
        }, this);
      }, this);
    }
  },

  destroy: function() {
    this.removeAttachedObservers();
    return this._super();
  },

  arrangedContent: Ember.computed('content', 'sortProperties.@each', 'filterProperty', 'filterRegex', 'filterValues.@each', 'filterJoiner', function(key, value) {
    var content = this.get('content'), retcontent,
        isSorted = this.get('isSorted'),
        sortProperties = this.get('sortProperties'),
        isFiltered = this.get('isFiltered'),
        filterProperties = this.get('filterProperties'),
        self = this;

    isFiltered = (isFiltered && (filteredByRegex || filteredByValues));

    if(content && (isSorted || isFiltered)) {
      retcontent = content.slice();
    }

    if(retcontent && isFiltered) {
      retcontent = this.filterContent(retcontent);
      content.forEach(function(item) {
        filterProperties.forEach(function(filterProperty) {
          Ember.addObserver(item, filterProperty.property, this, 'contentItemFilterPropertyDidChange');
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

    return content;
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
              Ember.removeObserver(item, filterProperty.property, this, 'contentItemFilterPropertyDidChange');
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
      var addedObjects = array.slice(idx, idx+addedCount);
      if(isFiltered) {
        addedObjects.forEach(function(item) {
          filterProperties.forEach(function(filterProperty) {
            Ember.addObserver(item, filterProperty.property, this, 'contentItemFilterPropertyDidChange');
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
        isFiltered = false;
    filterProperties.forEach(function(filterProperty) {
      var val = item.get(filterProperty.property);
      if(filterProperty.filteredByRegex) {
        isFiltered = regexObject.test(e.get(filterProperty.property));
      }
      else if(filterProperty.filteredByValues) {
        var filterJoiner = filterProperty.filterJoiner != 'or';
        isFiltered = filterProperty.filterJoiner;
        filterProperty.filterValues.forEach(function(fval) {
          var res = val == fval;
          isFiltered = (filterJoiner && (isFiltered && res)) || (!filterJoiner && (isFiltered || res));
        }, this);
      }
    }, this);
    if(arrangedContent.contains(item)) {
      if(!isFiltered) {
        sortProperties.forEach(function(sortProperty) {
          Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
        arrangedContent.removeObject(item);
      }
    }
    else {
      if(isFiltered) {
        sortProperties.forEach(function(sortProperty) {
          Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
        this.insertItemSorted(item);
      }
    }
  },
});

SortFilter.SortFilterView = Ember.View.create({
  columnData : [],
  layout : Ember.Handlebars.compile('' +
    '<div class="col-sm-3">' +
    '</div>' +
    '<div class="col-sm-9">' +
      '{{yield}}' +
    '</div>'),
});
