(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file
 * Provides Drupal API integrations for paragraphs_editor.
 */

var Drupal = window.Drupal    ,
  $ = window.jQuery    ;

Drupal.behaviors.paragraphs_editor_bundleselector = {
  attach: function(context) {
    $('.paragraphs-editor-bundle-selector-search', context).each(function() {
      var $container = $(this);
      var $input = $container.find('.paragraphs-editor-bundle-selector-search__input');
      var $submit = $container.find('.paragraphs-editor-bundle-selector-search__submit');

      $input.keyup(function (evt) {
        $submit.mousedown();
      }).blur(function () {
        $(this).trigger('focus');
      });
    });
  }
}

},{}],2:[function(require,module,exports){
var Drupal = window.Drupal    ,
  $ = window.jQuery    ,
  WidgetBinder = require('widget-binder');

module.exports = WidgetBinder.PluginInterface.SyncProtocol.extend({

  constructor: function(module_name) {
    this.moduleName = module_name;
  },

  send: function(type, data, resolver) {
    if (type == 'FETCH_SCHEMA') {
      this._get(data, resolver);
    }
    else {
      this._sendAjaxCommand(data, resolver);
    }
  },

  _sendAjaxCommand: function(command, resolver) {

    if (!command.command) {
      return;
    }
    var path = '/ajax/paragraphs-editor/' + command.command;

    if (command.targetContext) {
      path += '/' + command.targetContext;
    }

    if (command.sourceContext) {
      path += '/' + command.sourceContext;
    }

    if (command.itemId) {
      path += '/' + command.itemId;
    }

    if (command.widget) {
      path += '/' + command.widget;
    }

    if (command.type) {
      path += '/' + command.type;
    }

    var params = [];
    for (var key in command.settings) {
      params.push('settings[' + key + ']=' + command.settings[key]);
    }
    params.push('module=' + this.moduleName);
    path += '?' + params.join('&');

    var ajax = Drupal.ajax({
      url: path,
      progress: {
        message: "",
      },
    });

    ajax.options.data['editorContext'] = command.editorContext.id;

    if (command.editableContexts) {
      _.each(command.editableContexts, function(context) {
        var key = 'editableContexts';
        key += '[' + context.ownerId + ']';
        key += '[' + context.fieldId + ']';
        ajax.options.data[key] = context.id;
      });
    }

    var complete = ajax.options.complete;

    ajax.options.complete = function (xmlhttprequest, status) {
      complete.call(ajax.options, xmlhttprequest, status);
      Drupal.ajax.instances.splice(ajax.instanceIndex, 1);
    }

    ajax.execute();
  },

  _get: function(id, resolver) {
    $.get('/ajax/paragraphs-editor/schema/' + id, '', function(response) {
      resolver.resolve(response);
    });
  }
});

},{"widget-binder":37}],3:[function(require,module,exports){
/**
 * @file
 * Provides Drupal API integrations for paragraphs_editor.
 */

var _ = window._             ,
  Drupal = window.Drupal    ,
  drupalSettings = window.drupalSettings     ,
  $ = window.jQuery    ,
  WidgetBindingProtocol = require('./WidgetBindingProtocol');
  WidgetBinder = require('widget-binder');

require('./BundleSelector');

/**
 * {@namespace}
 */
Drupal.paragraphs_editor = {};

/**
 * Command to process response data from paragraphs editor commands.
 *
 * @param {Drupal.Ajax} [ajax]
 *   {@link Drupal.Ajax} object created by {@link Drupal.ajax}.
 * @param {object} response
 *   The response from the Ajax request.
 * @param {string} response.id
 *   The model id for the command that was used.
 */
Drupal.AjaxCommands.prototype.paragraphs_editor_data = function(ajax, response, status){
  var module_name = response.module;
  delete response.module;
  Drupal.paragraphs_editor.instances[module_name].getSyncActionResolver().resolve(response);
}

/**
 * Theme function for generating paragraphs editor widgets.
 *
 * @return {string}
 *   A string representing a DOM fragment.
 */
Drupal.theme.paragraphsEditorWidget = function(elementFactory, markup, actions) {
  _.each(actions, function(def, id) {
    def.title = Drupal.t(def.title);
  });
  return WidgetBinder.defaults.views['editor'].options.template(elementFactory, markup, actions);
}

/**
 * Theme function for generating paragraphs editor widgets.
 *
 * @return {string}
 *   A string representing a DOM fragment.
 */
Drupal.theme.paragraphsEditorExport = function(elementFactory, fields, edits) {
  return WidgetBinder.defaults.views['export'].options.template(elementFactory, fields, edits);
}

Drupal.paragraphs_editor.instances = {};

Drupal.paragraphs_editor.register = function(module_name, adapter) {
  var config = WidgetBinder.config();

  config.plugins = {
    adapter: adapter,
    protocol: new WidgetBindingProtocol(module_name),
  };

  config.elements.widget = {
    tag: 'paragraph',
    attributes: {
      'data-uuid': '<uuid>',
      'data-context-hint': '<context>',
      'data-viewmode': '<viewmode>',
    },
    selector: 'paragraph[data-context-hint]'
  };

  config.elements.field = {
    tag: 'paragraph-field',
    attributes: {
      'data-field-name': '<name>',
      'data-context': '<context>',
      'data-mutable': '<editable>',
    },
    selector: 'paragraph-field[data-mutable="true"],.editable-paragraph-field',
  };

  config.views['editor'].options.template = Drupal.theme.paragraphsEditorWidget;
  config.views['export'].options.template = Drupal.theme.paragraphsEditorExport;

  config.data = drupalSettings.paragraphs_editor;

  return this.instances[module_name] = new WidgetBinder(config);
}

Drupal.paragraphs_editor.WidgetBinder = WidgetBinder;

},{"./BundleSelector":1,"./WidgetBindingProtocol":2,"widget-binder":37}],4:[function(require,module,exports){
'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ,
  WidgetModel = require('./Models/WidgetModel');

/**
 * Represents a binder instance.
 *
 * Each binder instance should be associated with exactly one editor instance.
 *
 * This object should not be created directly. To create binders:
 *
 * @code
 * require('widget-binder').open($editorElement);
 * @endcode
 *
 * The binder couples all the objects needed to track widget data and perform
 * downstream synchronization from the server.
 *
 * Widget Lifecycle:
 *
 *   Create:
 *     When a widget is created it should call the 'bind' method on the binder
 *     to instruct the binder to start tracking the widget. This binds the
 *     editor widget to a server side data model and renders the widget using
 *     that model. It also attaches actions to the widget that users may
 *     perform, and sets up inline editing.
 *
 *   Edit:
 *     When an edit action is requested, the sync protocol requests that the
 *     server allow the user to edit widget's associated data entity model. If
 *     the markup changes, the widget is re-rendered and existing inline edits
 *     are preserved.
 *
 *   Duplicate:
 *     Since each widget is bound to a unique data entity on the server,
 *     operations like copy and paste, or moving a widget to a different part
 *     of the document may result in the widget's associated data entity being
 *     duplicated on the server. If this occurs, the widget will be re-rendered
 *     with its new references, again preserving inline edits.
 *
 *   Export:
 *     When the content author is finished editing, the editor perform cleanup
 *     on the markup. As a part of this "cleanup", the client calls the 'save'
 *     method to generate the "export markup", which is what will get sent to
 *     the server.
 *
 *   Destroy:
 *     When a widget is destroyed in the editor, the client calls the 'destroy'
 *     method to unbind and free all references to the widget.
 *
 * @param {Backbone.View} editorView
 *   The view that will be used to keep the editor root element in sync.
 *
 * @constructor
 */
module.exports = function(editorView) {
  this._editorView = editorView;
  this._widgetFactory = editorView.model.widgetFactory;
  this._viewFactory = editorView.model.viewFactory;
  this._widgetStore = editorView.model.widgetStore;
  this._editBufferMediator = editorView.model.editBufferMediator;
  this._contextResolver = editorView.model.contextResolver;
};

_.extend(module.exports.prototype, Backbone.Events, {

  /**
   * Requests that a new widget be inserted.
   *
   * @param {jQuery} $targetEl
   *   The element that the new widget will be inserted into.
   * @param {string} type
   *   The type of the item to request. This parameter is optional.
   *
   * @return {void}
   */
  create: function($targetEl, type) {
    this._editBufferMediator.requestBufferItem(type, $targetEl);
  },

  /**
   * Makes widget manager aware of a newly inserted widget.
   *
   * This is the most important method here. It is called when a new widget is
   * created in the editor in order to instruct the manager to start tracking
   * the lifecycle of the widget, its dom representation, and the edit buffer
   * data item it references.
   *
   * @param {mixed} widget
   *   The editor representation of a widget. This can be any data you want to
   *   associate with the widget, but will usually be an object generated by the
   *   editor. This will be available to the editor adapter during widget
   *   operations.
   * @param {mixed} id
   *   A unique identifier for the widget. This will usually be generated by the
   *   editor.
   * @param {jQuery} $targetEl
   *   The root element of the widget within the editor.
   *
   * @return {WidgetModel}
   *   The bound model.
   */
  bind: function(widget, id, $targetEl) {
    // Create a model for representing the widget.
    var widgetModel = this._widgetFactory.create(widget, id, $targetEl);
    var targetContext = widgetModel.editBufferItemRef.targetContext;
    var sourceContext = widgetModel.editBufferItemRef.sourceContext;

    // Create a widget view to render the widget within Editor.
    var widgetEditorView = this._viewFactory.create(widgetModel, $targetEl, 'editor');

    // Add the widget to the widget to the table to keep track of it.
    this._widgetStore.add(widgetModel, widgetEditorView);

    // Attach event handling.
    this.trigger('bind', this, widgetModel, widgetEditorView);

    this.listenTo(widgetModel, 'change', function() {
      if (widgetModel.hasState(WidgetModel.State.DESTROYED_REFS)) {
        this.trigger('unbind', this, widgetModel, widgetEditorView);
        this.stopListening(widgetModel);
      }
      if (widgetModel.hasState(WidgetModel.State.DESTROYED_WIDGET)) {
        this.trigger('destroy', this, widgetModel, widgetEditorView);
      }
    }, this);

    this.listenTo(widgetModel, 'save', function() {
      this.trigger('save', this, widgetModel, widgetEditorView);
    }, this);

    // If the widget is not currently using the editor view mode, we treat
    // it as being in 'export' form. This means we have to create an export
    // view to load the data.
    if (!widgetEditorView.isEditorViewRendered()) {
      this._viewFactory.createTemporary(widgetModel, $targetEl, 'export').save();
    }
    else {
      widgetEditorView.save();
    }

    // If there is more than one widget referencing the same buffer item we
    // need to duplicate it. Only one widget can ever reference a given
    // buffer item. Additionally, if the source context is not the same as the
    // target context we need to duplicate. A context mismatch essentially
    // means something was copied from another field instance into this field
    // instance, so all the data about it is in the original field instance.
    var matchingContexts = sourceContext.get('id') === targetContext.get('id');
    if (this._widgetStore.count(widgetModel) > 1 || !matchingContexts) {
      widgetModel.duplicate();
    }
    else {
      widgetEditorView.render();
    }

    return widgetModel;
  },

  /**
   * Unbinds (stops trakcing) a widget without destroying the widget itself.
   *
   * @param {mixed} id
   *   The id of the widget to be unbound.
   *
   * @return {WidgetModel}
   *   The saved model or undefined if no such model was found.
   */
  unbind: function(id) {
    return this._applyToModel(id, function(widgetModel) {
      this._widgetStore.remove(widgetModel, true);
    });
  },

  /**
   * Gets an existing widget.
   *
   * @param {mixed} id
   *   The widget id to lookup.
   *
   * @return {WidgetModel}
   *   A widget model if the id existed in the store, or undefined otherwise.
   */
  get: function(id) {
    return this._widgetStore.get(id, true).model;
  },

  /**
   * Requests an edit operation for a widget's referenced edit buffer item.
   *
   * This triggers an 'edit' command for the referenced edit buffer item. It's
   * up to the sync protcol plugin, and associated logic to determine how to
   * handle this command.
   *
   * @param {mixed} id
   *   The id of the model to generate an edit request for.
   *
   * @return {WidgetModel}
   *   The saved model or undefined if no such model was found.
   */
  edit: function(id) {
    return this._applyToModel(id, function(widgetModel) {
      widgetModel.edit();
    });
  },

  /**
   * Saves any inline edits to the widget.
   *
   * Note that this does not trigger a server sync. It simply updates the widget
   * model based on the current state of the editor view.
   *
   * The editor is in charge of managing the generated markup and sending it to
   * the server.
   *
   * @param {mixed} id
   *   The id of the widget to save inline edits for.
   * @param {jQuery} $targetEl
   *   The element to save the outputed data format to.
   *
   * @return {WidgetModel}
   *   The saved model or undefined if no such model was found.
   */
  save: function(id, $targetEl) {
    return this._applyToModel(id, function(widgetModel) {
      widgetModel.trigger('save');
      this._viewFactory.createTemporary(widgetModel, $targetEl, 'editor').save();
      this._viewFactory.createTemporary(widgetModel, $targetEl, 'export').render().save();
    });
  },

  /**
   * Destroys a widgets tracking data and initiates widget destruction.
   *
   * @param {mixed} id
   *   The id of the widget to be destroyed.
   * @param {bool} widgetDestroyed
   *   Set to true if the widget has already been destroyed in the editor.
   *   Setting this to false will result in the destruction of the widget within
   *   the editor.
   *
   * @return {WidgetModel}
   *   The destroyed model.
   */
  destroy: function(id, widgetDestroyed) {
    this._applyToModel(id, function(widgetModel) {
      if (widgetDestroyed) {
        widgetModel.setState(WidgetModel.State.DESTROYED_WIDGET);
      }
      widgetModel.destroy();
    });
  },

  /**
   * Cleans up after the widget manager object.
   *
   * @return {void}
   */
  close: function() {
    this._editorView.model.destroy();
    this._editorView.stopListening();
    this._widgetStore.cleanup();
    this._editBufferMediator.cleanup();
  },

  /**
   * Gets the settings for this binder instance.
   *
   * The settings are linked to the root (editor) context.
   *
   * @return {object}
   *   The settings object for the root context.
   */
  getSettings: function() {
    return this._contextResolver.getEditorContext().get('settings');
  },

  /**
   * Sets the settings for this binder instance.
   *
   * The settings are linked to the root (editor) context.
   *
   * @param {object} settings
   *   The settings object to write. Note that this will overwrite the *entire*
   *   existing settings object.
   *
   * @return {void}
   */
  setSettings: function(settings) {
    this._contextResolver.getEditorContext().set({ settings: settings });
  },

  /**
   * Gets an individual setting by name.
   *
   * The settings are linked to the root (editor) context.
   *
   * @param {string} name
   *   The name of the setting to lookup.
   *
   * @return {mixed}
   *   The setting value or undefined if no value was found.
   */
  getSetting: function(name) {
    return this._contextResolver.getEditorContext().getSetting(name);
  },

  /**
   * Resolves the context for an element.
   *
   * @param {jQuery} $el
   *   The element to resolve the context of.
   * @param {string} type
   *   The type of resolution to perform. The options are:
   *    - 'target': Resolves the conext at the elements position in the editor.
   *      This is usually the context you are looking for, and is the default
   *      if no type is explicitly provided.
   *    - 'source': Resolves the context the element has been tagged with.
   *      The source context may be different than the target context if, for
   *      example, the widget was recently copied from one context and pasted
   *      into another. The widget binder automatically resolves these
   *      situations in the background, so there should rarely be a situation
   *      where client code needs the source context.
   *
   * @return {Backbone.Model}
   *   The context model associated with the element.
   */
  resolveContext: function($el, type) {
    if (!type) {
      type = 'target';
    }
    if (type == 'target') {
      return this._contextResolver.resolveTargetContext($el);
    }
    else if (type == 'source') {
      return this._contextResolver.resolveSourceContext($el);
    }
    else {
      throw new Error('Invalid context type.');
    }
  },

  /**
   * A convenience function for looking up a widget and applying an action.
   *
   * @param {mixed} id
   *   The id of the widget to act on.
   * @param {function} callback
   *   The action to apply the model, if found.
   *
   * @return {WidgetModel}
   *   The model acted on, if an action was applied.
   */
  _applyToModel: function(id, callback) {
    var widgetModel = this.get(id);
    if (widgetModel) {
      callback.apply(this, [widgetModel]);
      return widgetModel;
    }
  }
});

},{"./Models/WidgetModel":25}],5:[function(require,module,exports){
/**
 * @file
 * A Backbone collection of schema models.
 */

'use strict';

var Backbone = window.Backbone    ,
  ContextModel = require('../Models/ContextModel');

/**
 * Backbone Collection for context models.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.Collection.extend({

  model: ContextModel,

  /**
   * @inheritdoc
   */
  get: function(contextId, settings, skipLazyLoad) {
    if (typeof contextId == 'string' && !skipLazyLoad) {
      if (!Backbone.Collection.prototype.get.call(this, contextId)) {
        if (!settings) {
          settings = {};
        }
        var model = new ContextModel({ id: contextId, settings: settings });
        this.add(model);
      }
    }
    return Backbone.Collection.prototype.get.call(this, contextId);
  },

  /**
   * Convenience wrapper for 'get' to ensure that a context exists.
   *
   * @note this does not return the context.
   *
   * @param {string} contextId
   *   The context id to ensure exists.
   *
   * @return {void}
   */
  touch: function(contextId) {
    this.get(contextId);
  }

});

},{"../Models/ContextModel":21}],6:[function(require,module,exports){
/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

'use strict';

var Backbone = window.Backbone    ,
  EditBufferItemModel = require('../Models/EditBufferItemModel');

/**
 * Backbone Collection for edit buffer item models.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.Collection.extend({

  model: EditBufferItemModel,

  /**
   * @inheritdoc
   */
  initialize: function(models, options) {
    this._contextId = options.contextId;
  },

  /**
   * Get an edit buffer item model.
   *
   * Loads the item from the server it does not currently exist in the client-side
   * buffer.
   *
   * @param {CommandEmitter} commandEmitter
   *   The editor command emitter to use in case the item cannot be found
   *   locally.
   * @param {string} uuid
   *   The edit buffer item id to get.
   *
   * @return {Backbone.Model}
   *   The buffer item model.
   */
  getItem: function(commandEmitter, uuid) {
    var itemModel = this.get(uuid);
    if (!itemModel) {
      itemModel = this.add({id: uuid}, {merge: true});
      commandEmitter.render(this.getContextId(), uuid);
    }
    return itemModel;
  },

  /**
   * Provides a consistent 'setter' API wrapper.
   *
   * @param {Backbone.Model} itemModel
   *   The model to be set in the collection.
   *
   * @return {mixed}
   *   See return value for Backbone.Collection.add.
   */
  setItem: function(itemModel) {
    return this.add(itemModel, {merge: true});
  },

  /**
   * Provides a consistent API wrapper for removing items.
   *
   * @param {string} uuid
   *   The uuid to be removed from the collection.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  removeItem: function(uuid) {
    this.remove(uuid);
  },

  /**
   * Gets the context id this edit buffer belongs to.
   *
   * @return {string}
   *   The context id.
   */
  getContextId: function() {
    return this._contextId;
  }
});

},{"../Models/EditBufferItemModel":22}],7:[function(require,module,exports){

'use strict';

var Backbone = window.Backbone    ,
  EditorModel = require('../Models/EditorModel');

/**
 */
module.exports = Backbone.Collection.extend({
  model: EditorModel,
});

},{"../Models/EditorModel":23}],8:[function(require,module,exports){
/**
 * @file
 * A Backbone collection of schema entry models
 */

'use strict';

var Backbone = window.Backbone    ,
  SchemaModel = require('../Models/SchemaModel');

/**
 * Backbone Collection for schema models.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.Collection.extend({

  model: SchemaModel,

  /**
   * @inheritdoc
   */
  initialize: function(models, options) {
    this.listenTo(options.contextCollection, 'add', this.addContextSchema);
    this._dispatcher = options.dispatcher;
  },

  /**
   * Checks if a type is allowed within a given schema node.
   *
   * @param {string} schemaId
   *   The schema id to check within.
   * @param {string} type
   *   The type to check for.
   *
   * @return {bool}
   *   True if the type is allowed, false otherwise.
   */
  isAllowed: function(schemaId, type) {
    var model = this.get(schemaId);
    return !!(model && model.get('allowed')[type]);
  },

  /**
   * Adds the schema for a given context.
   *
   * @param {Context} contextModel
   *   The context to add the schema for.
   *
   * @return {void}
   */
  addContextSchema: function(contextModel) {
    this._fetchSchema(contextModel);
    this.listenTo(contextModel, 'change:schemaId', this._fetchSchema);
  },

  /**
   * Helper function to fetch the schema for a model if it doesn't exist.
   *
   * @param {Context} contextModel
   *   The model to fetch the schema for.
   *
   * @return {void}
   */
  _fetchSchema: function(contextModel) {
    var id = contextModel.get('schemaId');
    if (id) {
      if (!this.get(id)) {
        this._dispatcher.dispatch('FETCH_SCHEMA', id);
      }
    }
  }

});

},{"../Models/SchemaModel":24}],9:[function(require,module,exports){

'use strict';

var Backbone = window.Backbone    ,
  WidgetModel = require('../Models/WidgetModel');

/**
 */
module.exports = Backbone.Collection.extend({
  model: WidgetModel,
});


},{"../Models/WidgetModel":25}],10:[function(require,module,exports){
/**
 * @file
 * Provides a mechanism for controlling subscriptions to multiple contexts.
 */

'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ;

/**
 * Listens to a group of context's edit buffers.
 *
 * @constructor
 */
module.exports = function() {
};

_.extend(module.exports.prototype, Backbone.Events, {

  /**
   * Add a context to the listener.
   *
   * @param {Context} context
   *   The context to listen to.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  addContext: function(context) {
    this.listenTo(context.editBuffer, 'add', this._triggerEvents);
    return this;
  },

  /**
   * Emits an 'insertItem' or 'updateItem' event for a model.
   *
   * @param {EditBufferItemModel} bufferItemModel
   *   The model that the event is being triggered for.
   *
   * @return {void}
   */
  _triggerEvents: function(bufferItemModel) {
    if (bufferItemModel.get('insert')) {
      this.trigger('insertItem', bufferItemModel);
      bufferItemModel.set({insert: false});
    }
    else {
      this.trigger('updateItem', bufferItemModel);
    }
  },

  /**
   * Cleans up after the object when it is ready to be destroyed.
   *
   * @return {void}
   */
  cleanup: function() {
    this.stopListening();
  }
});

},{}],11:[function(require,module,exports){
/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

'use strict';

var _ = window._             ;

/**
 * A class for resolving the assicuated context(s) for an element.
 *
 * @param {ConextCollection} contextCollection
 *   The contextCollection to use to lookup contexts.
 * @param {string} sourceContextAttribute
 *   The source context attribute name.
 * @param {string} targetContextAttribute
 *   The target context attribute name.
 * @param {Context} editorContext
 *   The root context of the editor instance.
 *
 * @constructor
 */
module.exports = function(contextCollection, sourceContextAttribute, targetContextAttribute, editorContext) {
  this._contextCollection = contextCollection;
  this._sourceContextAttribute = sourceContextAttribute;
  this._targetContextAttribute = targetContextAttribute;
  this._editorContext = editorContext;
};

_.extend(module.exports.prototype, {

  /**
   * Resolves the context of an element based on its position in the editor.
   *
   * @param {jQuery} $el
   *   The element to resolve the context of.
   *
   * @return {Backbone.Model}
   *   The context model associated with the element.
   */
  resolveTargetContext: function ($el) {
    var contextId = $el.attr(this._targetContextAttribute);
    if (!contextId) {
      contextId = $el.closest('[' + this._targetContextAttribute + ']').attr(this._targetContextAttribute);
    }

    return this.get(contextId);
  },

  /**
   * Resolves the context an element has been tagged with.
   *
   * @param {jQuery} $el
   *   The element to resolve the context of.
   *
   * @return {Backbone.Model}
   *   The context model associated with the element.
   */
  resolveSourceContext: function($el) {
    var contextId = $el.attr(this._sourceContextAttribute);
    return contextId ? this.get(contextId) : this._editorContext;
  },

  /**
   * Gets the root editor context.
   *
   * @return {Backbone.Model}
   *   The root editor context.
   */
  getEditorContext: function() {
    return this._editorContext;
  },

  /**
   * Gets a context based on its context id.
   *
   * @param {string} contextId
   *   The id of the context to get.
   *
   * @return {Backbone.Model}
   *   The context model.
   */
  get: function(contextId) {
    if (contextId) {
      var settings = this._editorContext ? this._editorContext.get('settings') : {};
      return this._contextCollection.get(contextId, settings);
    }
    else {
      return this._editorContext;
    }
  },

  /**
   * Ensures that a context exists in the collection.
   *
   * @param {string} contextId
   *   The context id to ensure exists.
   *
   * @return {void}
   */
  touch: function(contextId) {
    this._contextCollection.touch(contextId);
  },

});

},{}],12:[function(require,module,exports){
/**
 * @file
 * Provides an actionable reference to a edit buffer item.
 */

'use strict';

var _ = window._             ;

/**
 * Represents a reference to an edit buffer item.
 *
 * @param {EditBufferItemModel} bufferItemModel
 *   The model this will reference.
 * @param {Context} sourceContext
 *   The context the edit buffer item says it belongs to.
 * @param {Conext} targetContext
 *   The context the edit buffer item's associated widget lives in.
 * @param {CommandEmitter} commandEmitter
 *   A command emitter for emitting commands related to the referenced edit
 *   buffer item.
 *
 * @constructor
 */
module.exports = function(bufferItemModel, sourceContext, targetContext, commandEmitter) {
  this.editBufferItem = bufferItemModel; 
  this.sourceContext = sourceContext; 
  this.targetContext = targetContext; 
  this._commandEmitter = commandEmitter; 
};

_.extend(module.exports.prototype, {

  /**
   * Issues an edit command for the referenced buffer item.
   *
   * @param {object} edits
   *   A map where keys are context ids and values are their associated inline
   *   edits.
   *
   * @return {void}
   */
  edit: function(edits) {
    this._commandEmitter.edit(this.targetContext.get('id'), this.editBufferItem.get('id'), edits);
  },

  /**
   * Issues a render command for the referenced buffer item.
   *
   * @param {object} edits
   *   A map where keys are context ids and values are their associated inline
   *   edits.
   *
   * @return {void}
   */
  render: function(edits) {
    this._commandEmitter.render(this.targetContext.get('id'), this.editBufferItem.get('id'), edits);
  },

  /**
   * Issues a duplicate command for the referenced buffer item.
   *
   * @param {mixed} widgetId
   *   The id of the widget that will recieve the duplicate.
   * @param {object} edits
   *   A map where keys are context ids and values are their associated inline
   *   edits.
   *
   * @return {void}
   */
  duplicate: function(widgetId, edits) {
    this._commandEmitter.duplicate(this.targetContext.get('id'), this.sourceContext.get('id'), this.editBufferItem.get('id'), widgetId, edits);
  }

});

},{}],13:[function(require,module,exports){
/**
 * @file
 * Provides a factory for creating edit buffer item references.
 */

'use strict';

var _ = window._             ,
  EditBufferItemRef = require('./EditBufferItemRef');

module.exports = function(contextResolver, commandEmitter) {
  this._contextResolver = contextResolver;
  this._commandEmitter = commandEmitter;
};

_.extend(module.exports.prototype, {

  create: function(bufferItemModel, sourceContext, targetContext) {
    var fallbackContext = this._contextResolver.get(bufferItemModel.collection.getContextId());

    if (!sourceContext) {
      sourceContext = fallbackContext;
    }

    if (!targetContext) {
      targetContext = fallbackContext;
    }

    return new EditBufferItemRef(bufferItemModel, sourceContext, targetContext, this._commandEmitter);
  },

  createFromIds: function(itemId, sourceContextId, targetContextId) {
    if (!sourceContextId || !targetContextId) {
      throw new Error('Source and target context ids are explicitly required');
    }
    var sourceContext = this._contextResolver.get(sourceContextId);
    var targetContext = this._contextResolver.get(targetContextId);
    var bufferItemModel = sourceContext.editBuffer.getItem(this._commandEmitter, itemId);
    return this.create(bufferItemModel, sourceContext, targetContext);
  },

  requestNewItem: function(targetContext, type){
    this._commandEmitter.insert(targetContext, type);
  },

});

},{"./EditBufferItemRef":12}],14:[function(require,module,exports){
/**
 * @file
 * Provides a mediator for negotiating the insertion of new items.
 */

'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ;

/**
 * A class for mediating requests for new edit buffer items from the server.
 *
 * @param {EditBufferItemRefFactory} editBufferItemRefFactory
 *   The factory to use for creating edit buffer item references.
 * @param {ElementFactory} elementFactory
 *   The factory to use for creating embedable widget elements.
 * @param {ContextListener} contextListener
 *   The listener that listens for new edit buffer items being delivered.
 * @param {EditorAdapter} adapter
 *   The editor adapter that handles insertion of new embed codes into the
 *   editor.
 * @param {ContextResolver} contextResolver
 *   The context resolver to use for resolving the context that a widget is
 *   being inserted into.
 *
 * @constructor
 */
module.exports = function(editBufferItemRefFactory, elementFactory, contextListener, adapter, contextResolver) {
  this._editBufferItemRefFactory = editBufferItemRefFactory;
  this._elementFactory = elementFactory;
  this._contextListener = contextListener;
  this._adapter = adapter;
  this._contextResolver = contextResolver;
  this.listenTo(this._contextListener, 'insertItem', this._insertBufferItem);
};

_.extend(module.exports.prototype, Backbone.Events, {

  /**
   * Triggers the widget insertion flow.
   *
   * @param {string} type
   *   The type name of the widget to insert.
   * @param {jQuery} $el
   *   The insertion point for the new item being requested.
   *
   * @return {void}
   */
  requestBufferItem: function(type, $el) {
    var targetContext = this._contextResolver.resolveTargetContext($el);
    this._contextListener.addContext(targetContext);
    this._editBufferItemRefFactory.requestNewItem(targetContext.get('id'), type);
  },

  /**
   * Cleans up the mediator in preparation for destruction.
   *
   * @return {void}
   */
  cleanup: function() {
    this._contextListener.cleanup();
    this.stopListening();
  },

  /**
   * Handler for new edit buffer items being delivered.
   *
   * @param {EditBufferItemModel} bufferItemModel
   *   The new model being inserted
   *
   * @return {void}
   */
  _insertBufferItem: function(bufferItemModel) {
    var item = this._editBufferItemRefFactory.create(bufferItemModel);

    // If the new model is ready to be inserted, insert an embed code in
    // Editor and mark the model as inserted.
    var embedCode = this._elementFactory.create('widget', {
      uuid: bufferItemModel.get('id'),
      context: item.targetContext.get('id'),
    });
    embedCode.setAttribute('<viewmode>', 'editor');
    this._adapter.insertEmbedCode(embedCode);
  }

});

},{}],15:[function(require,module,exports){
/**
 * @file
 * Provides the logic for executing editor commands.
 */

'use strict';

var _ = window._             ;

/**
 * Creates a CommandEmitter object.
 *
 * @param {SyncActionDispatcher} dispatcher
 *   The action dispatcher to use for dispatching commands.
 * @param {ContextResolver} contextResolver
 *   The context resolver used to lookup context models associated with
 *   commands.
 *
 * @constructor
 */
module.exports = function(dispatcher, contextResolver) {
  this._dispatcher = dispatcher;
  this._contextResolver = contextResolver;
};

_.extend(module.exports.prototype, {

  /**
   * Executes an "insert" command.
   *
   * @param {string} targetContextId
   *   The id of the context the new item will be inserted into.
   * @param {string} type
   *   The type to insert. This is optional.
   *
   * @return {void}
   */
  insert: function(targetContextId, type) {
    var options = {
      command: 'insert',
      targetContext: targetContextId,
    };

    if (type) {
      options.type = type;
    }

    this._execute('INSERT_ITEM', options);
  },

  /**
   * Executes an "edit" command.
   *
   * @param {string} targetContextId
   *   The id of the context the buffer item belongs to.
   * @param {string} itemId
   *   The id of the buffer item to be edited.
   * @param {object} edits
   *   A map of inline edits to be preserved. See WidgetModel for the format of
   *   inline edits.
   *
   * @return {void}
   */
  edit: function(targetContextId, itemId, edits) {
    this._execute('EDIT_ITEM', {
      command: 'edit',
      targetContext: targetContextId,
      itemId: itemId,
      edits: edits
    });
  },

  /**
   * Executes a "render" command.
   *
   * @param {string} targetContextId
   *   The id of the context the buffer item belongs to.
   * @param {string} itemId
   *   The id of the buffer item to be rendered.
   * @param {object} edits
   *   A map of inline edits to be preserved. See WidgetModel for the format of
   *   inline edits.
   *
   * @return {void}
   */
  render: function(targetContextId, itemId, edits) {
    this._execute('RENDER_ITEM', {
      command: 'render',
      targetContext: targetContextId,
      itemId: itemId,
      edits: edits
    });
  },

  /**
   * Executes an "duplicate" command.
   *
   * @param {string} targetContextId
   *   The id of the context the new item will be inserted into.
   * @param {string} sourceContextId
   *   The id of the context the item being duplicated belongs to.
   * @param {string} itemId
   *   The id of the buffer item to be duplicated.
   * @param {mixed} widgetId
   *   The id of the widget that will be updated to reference the newly created
   *   item.
   * @param {object} edits
   *   A map of inline edits to be preserved. See WidgetModel for the format of
   *   inline edits.
   *
   * @return {void}
   */
  duplicate: function(targetContextId, sourceContextId, itemId, widgetId, edits) {
    this._execute('DUPLICATE_ITEM', {
      command: 'duplicate',
      targetContext: targetContextId,
      sourceContext: sourceContextId,
      itemId: itemId,
      widget: widgetId,
      edits: edits
    });
  },

  /**
   * Internal callback for triggering the command to be sent.
   *
   * @param {string} type
   *   The type of command being performed.
   * @param {object} command
   *   The command data to be passed to the dispatched.
   *
   * @return {void}
   */
  _execute: function(type, command) {
    var editorContext = this._contextResolver.getEditorContext();
    command.editorContext = editorContext.toJSON();
    command.settings = editorContext.get('settings');

    if (command.edits) {
      command.editableContexts = {};
      _.each(command.edits, function(value, contextId) {
        var context = this._contextResolver.get(contextId);
        command.editableContexts[contextId] = context.toJSON();
      }, this);
    }

    this._dispatcher.dispatch(type, command);
  }
});

},{}],16:[function(require,module,exports){
/**
 * @file
 * Provides the logic for creating widget models.
 */

'use strict';

var _ = window._             ,
  WidgetModel = require('../../Models/WidgetModel');

/**
 * Creates a widget factory.
 *
 * @param {ContextResolver} contextResolver
 *   A context resolver to use for resolving the source and target contexts for
 *   a widget.
 * @param {EditBufferItemRefFactory} editBufferItemRefFactory
 *   The edit buffer item reference factory to pass through to created widgets.
 * @param {string} uuidAttributeName
 *   The name of the uuid attribute on the widget element to pull edit buffer
 *   item ids from the DOM.
 *
 * @constructor
 */
module.exports = function(contextResolver, editBufferItemRefFactory, uuidAttributeName) {
  this._contextResolver = contextResolver;
  this._editBufferItemRefFactory = editBufferItemRefFactory;
  this._uuidAttributeName = uuidAttributeName;
};

_.extend(module.exports.prototype, {

  /**
   * Creates a new widget model based on data provided by the editor.
   *
   * @param {mixed} widget
   *   This is any arbitrary data the editor implementation wants to associate
   *   with the widget model. This lets you access editor-specific widget data
   *   structures from within the editor adapter.
   * @param {mixed} id
   *   A unique identifier for the widget. In most cases, it makes sense to pass
   *   this through directly from the facility that the editor used to create
   *   the widget.
   * @param {jQuery} $el
   *   The widget element. This will be used to derive the context being
   *   inserted into (targetContext), the context the referenced edit buffer
   *   item came from (sourceContext), and the referenced item id.
   *
   * @return {WidgetModel}
   *   The newly created widget model.
   */
  create: function(widget, id, $el) {
    var sourceContext = this._contextResolver.resolveSourceContext($el);
    var targetContext = this._contextResolver.resolveTargetContext($el);

    var options = {
      editBufferItemRefFactory: this._editBufferItemRefFactory,
      contextResolver: this._contextResolver,
      widget: widget,
    };

    return new WidgetModel({
      id: id,
      contextId: targetContext.get('id'),
      itemId: $el.attr(this._uuidAttributeName),
      itemContextId: sourceContext.get('id'),
    }, options);
  },

});

},{"../../Models/WidgetModel":25}],17:[function(require,module,exports){
/**
 * @file
 * Provides a class for storing widget tracking data.
 */

'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ,
  WidgetModel = require('../../Models/WidgetModel'),
  WidgetCollection = require('../../Collections/WidgetCollection');

/**
 * Creates a WidgetStore object.
 *
 * @param {EditorAdapter} adapter
 *   The editor adapter that will be used to tie the editor widget state to the
 *   internal tracked widget state.
 *
 * @constructor
 */
module.exports = function(adapter) {
  this._adapter = adapter;
  this._views = {};
  this._widgetCollection = new WidgetCollection();
};

_.extend(module.exports.prototype, Backbone.Events, {

  /**
   * Adds a model to the widget store.
   *
   * @param {object} widgetModel
   *   The widget model to be tracked, or an attributes object to update an
   *   existing model with. If an attributes object is provided, it must have an
   *   id attribute and the mode must already be in the store. Otherwise an
   *   error will be thrown. If a model is provided and belongs to a collection,
   *   it must belong to the widget store instance collection. Otherwise an
   *   error will be thrown.
   * @param {Backbone.View} widgetView
   *   An optional view corresponding to the widget's DOM element, if one
   *   exists. This will be used to track whether the widget is present in the
   *   DOM and if it gets orphaned.
   *
   * @return {WidgetModel}
   *   The added model.
   */
  add: function(widgetModel, widgetView) {
    if (!(widgetModel instanceof Backbone.Model)) {
      var attributes = widgetModel;
      widgetModel = this._widgetCollection.get(attributes.id);
      if (!widgetModel) {
        throw new Error('Attempt to update an unknown widget.');
      }
      widgetModel.set(attributes);
    }

    if (widgetModel.collection) {
      if (widgetModel.collection !== this._widgetCollection) {
        throw new Error('The widget being added already belongs to another editor.');
      }
    }
    else {
      this.listenTo(widgetModel, 'destroy', this._removeWrapper);
      this.listenTo(widgetModel, 'change:itemId', this._updateItemReference);
      this._widgetCollection.add(widgetModel);
    }

    if (widgetView) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');
      if (!this._views[i]) {
        this._views[i] = {};
      }
      this._views[i][j] = widgetView;
    }

    return widgetModel;
  },

  /**
   * Gets a widget model, view pair based on its widget id.
   *
   * @param {mixed} id
   *   The id of the widget to get.
   * @param {bool} modelOnly
   *   Set to true to skip editor view lookup. This should be used for
   *   read-only access to the model since this method has the side-effect of
   *   cleaning up the reference table if the view is not found in the DOM.
   *
   * @return {object}
   *   An object with keys 'model' and 'view', which are respectively the model
   *   and view objects associated with the widget id. If either cannot be
   *   found, the value in the respective key is null.
   */
  get: function(id, modelOnly) {
    var widgetModel = this._widgetCollection.get(id);
    if (widgetModel && !modelOnly) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');
      return {
        model: widgetModel,
        view: this._readCell(i, j),
      };
    }

    return {
      model: widgetModel ? widgetModel : null,
      view: null
    };
  },

  /**
   * Removes a model from the store.
   *
   * If the widget has not already been marked as destroyed by the editor, this
   * method will also trigger widget destruction within the editor through the
   * editor adapter.
   *
   * @param {WidgetModel} widgetModel
   *   The widget model to be removed from the store.
   * @param {bool} skipDestroy
   *   Allows the client to stop tracking a widget without actually triggering
   *   the destruction of that widget within the editor. Pass true to avoid
   *   destroying the editor widget. By default, calling this method will
   *   trigger widget destruction within the editor if it has not already been
   *   destroyed.
   *
   * @return {WidgetModel}
   *   The widget model that was destroyed.
   */
  remove: function(widgetModel, skipDestroy) {
    if (!widgetModel) {
      return;
    }

    var i = widgetModel.get('itemId');
    var j = widgetModel.get('id');

    // If the widget has not already been destroyed within the editor, then
    // removing it here triggers its destruction. We provide the caller the
    // ability to sidestep this side effect with the skipDestroy opt-out.
    if (!widgetModel.hasState(WidgetModel.State.DESTROYED_WIDGET) && !skipDestroy) {
      this._adapter.destroyWidget(widgetModel.get('id'));
    }

    // If there is currently a view assocaited with the widget, then destroy it.
    if (this._views[i] && this._views[i][j]) {
      var view = this._views[i][j];
      delete this._views[i][j];
      view.remove();
    }

    // Remove the widget from the internal collection, perform memory cleanup,
    // and mark the widget model as no longer being tracked.
    this._cleanRow(i);
    this._widgetCollection.remove(widgetModel);
    widgetModel.setState(WidgetModel.State.DESTROYED_REFS);

    return widgetModel;
  },

  /**
   * Counts the number of different widgets that reference the same buffer item.
   *
   * @param {WidgetModel} widgetModel
   *   A widget model to count the buffer item references for. This function
   *   will return the total number of widgets that reference the buffer item
   *   given by the itemId attribute on the widget model, including the passed
   *   widget iteself.
   *
   * @return {int}
   *   The number of widgets referencing the item specified by the passed widget
   *   model's referenced item.
   */
  count: function(widgetModel) {
    var count = 0;

    if (widgetModel) {
      var i = widgetModel.get('itemId');
      for (var j in this._views[i]) {
        if (this._readCell(i, j)) {
          count++;
        }
      }
    }

    return count;
  },

  /**
   * Triggers the destruction of all tracked widgets and data structures.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  cleanup: function() {
    for (var i in this._views) {
      for (var j in this._views[i]) {
        this._views[i][j].remove();
      }
      delete this._views[i];
    }
    this._widgetCollection.reset();
    this._adapter.cleanup();
    return this.stopListening();
  },

  /**
   * Safely retrieves a view from the table if possible.
   *
   * @param {int} i
   *   The row (buffer item id) in the view table to read from.
   * @param {int} j
   *   The column (widget id) in the view table to read from.
   *
   * @return {Backbone.View}
   *   A view object if one exists in the view table it (i,j), null otherwise.
   */
  _readCell: function(i, j) {
    var view = null;

    if (this._views[i] && this._views[i][j]) {
      view = this._views[i][j];
      if (!this._adapter.getRootEl().contains(view.el)) {
        this.remove(view.model);
        view = null;
      }
    }

    return view;
  },

  /**
   * Reclaims space from an unused row.
   *
   * This is called after performing entry removals to delete rows in the view
   * table once they become empty.
   *
   * @param {int} i
   *   The row in the view table to check for cleanup. If this row is empty, it
   *   will be removed.
   *
   * @return {void}
   */
  _cleanRow: function(i) {
    if (this._views[i] && _.isEmpty(this._views[i])) {
      delete this._views[i];
    }
  },

  /**
   * Updates the widget table when a widget's referenced item has changed.
   *
   * This ensures that when a buffer item is duplicated for a widget, and the
   * widget gets updated to point to the new item, the view table is updated to
   * reflect the change. In particular this means moving the data from the old
   * table entry to the new table entry.
   *
   * @param {WidgetModel} widgetModel
   *   The widget model that has had its itemId attribute updated.
   *
   * @return {void}
   */
  _updateItemReference: function(widgetModel) {
    var i = widgetModel.previous('itemId');
    var j = widgetModel.get('id');
    var k = widgetModel.get('itemId');

    if (this._views[i] && this._views[i][j]) {
      if (!this._views[k]) {
        this._views[k] = {};
      }
      this._views[k][j] = this._views[i][j];
      delete this._views[i][j];
    }

    this._cleanRow(i);
  },

  _removeWrapper: function(widgetModel) {
    this.remove(widgetModel);
  }
});

},{"../../Collections/WidgetCollection":9,"../../Models/WidgetModel":25}],18:[function(require,module,exports){
/**
 * @file
 * Provides a class for generating widget views.
 */

'use strict';

var _ = window._             ;

/**
 * Creates a WidgetViewFactory object.
 *
 * @param {ElementFactory} elementFactory
 *   The element factory that will be injected into created views.
 * @param {EditorAdapter} adapter
 *   The editor adapter that will be injected into created views.
 *
 * @constructor
 */
module.exports = function(elementFactory, adapter) {
  this._elementFactory = elementFactory;
  this._adapter = adapter;
  this._viewModes = [];
};

_.extend(module.exports.prototype, {

  /**
   * Registers a view mode.
   *
   * View modes correspond to specific view prototypes. This allows widgets to
   * be displayed in different forms. For the purposes of the widget-sync
   * library, this generally means we have one 'editor' view mode that the user
   * will interact with in the wysiwyg, and one or more 'export' view mode(s)
   * that will be used to transform user input into a format that is easier to
   * save.
   *
   * @param {string} viewMode
   *   The name of the view mode being registered.
   * @param {object} def
   *   The definition of the object being registered. See config.js for examples
   *   of the format of this object. At minimum, each definition needs a
   *   'prototype' key that is a Backbone.View descended type.
   *
   * @return {object}
   *   The passed defition if no errors occurred.
   */
  register: function(viewMode, def) {
    if (!def || !def.prototype) {
      throw new Error('View mode requires a view prototype.');
    }

    return this._viewModes[viewMode] = def;
  },

  /**
   * Creates a view for a widget model.
   *
   * @param {WidgetModel} widgetModel
   *   The widget model to create the view for.
   * @param {jQuery} $el
   *   A jQuery wrapped element for the element that will be the root of the
   *   view.
   * @param {string} viewMode
   *   The view mode to create for the widget. This will be used to determine
   *   which view prototype is used to instantiate the view. viewMode must have
   *   previously been registered through the register method.
   *
   * @return {Backbone.View}
   *   The newly created view object.
   */
  create: function(widgetModel, $el, viewMode) {
    if (!viewMode) {
      viewMode = widgetModel.get('viewMode');
    }

    var def = this._viewModes[viewMode];
    if (!def) {
      throw new Error('Invalid view mode "' + viewMode + '"');
    }

    var options = def.options ? def.options : {};

    return new def.prototype(_.extend({
      model: widgetModel,
      adapter: this._adapter,
      elementFactory: this._elementFactory,
      el: $el.get(0),
    }, options));
  },

  /**
   * Creates a view for a widget model, and blocks its event handlers.
   *
   * By default, views are created with a long-term lifecycle in mind. They
   * attach themselves to the DOM, listen for changes to the model, and update
   * the DOM.
   *
   * In certain cases, we desire to create a view simply to use its markup
   * processing logic. We do this in order to transform markup into application
   * state.
   *
   * If we simply use the create method in this case, views can prevent
   * themselves from being destroyed, and can cause unwanted side-effects by
   * attaching their own notification handlers to the model. To prevent this, 
   * we use this method to create a short-term lifecycle view that can be
   * discarded without side-effects.
   *
   * @param {WidgetModel} widgetModel
   *   The widget model to create the view for.
   * @param {jQuery} $el
   *   A jQuery wrapped element for the element that will be the root of the
   *   view.
   * @param {string} viewMode
   *   The view mode to create for the widget. This will be used to determine
   *   which view prototype is used to instantiate the view. viewMode must have
   *   previously been registered through the register method.
   *
   * @return {Backbone.View}
   *   The newly created view object, with all listeners removed.
   */
  createTemporary: function(widgetModel, $el, viewMode) {
    return this.create(widgetModel, $el, viewMode).stopListening();
  }

});

},{}],19:[function(require,module,exports){
/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

'use strict';

var _ = window._             ;

/**
 * Abstract representation of an HTML element.
 *
 * @param {string} tag
 *   The html tag name of the element.
 * @param {object} attributeMap
 *   A mapping of attributes for the element. Keys are attribute names and
 *   values are either hard-coded attribute values or data references in the
 *   for '<datakeyname>'.
 * @param {string} selector
 *   A selector for finding elements of this type.
 * @param {object} data
 *   Data to associate with each attribute in the attribute map.
 *
 * @constructor
 */
module.exports = function(tag, attributeMap, selector, data) {
  var element = this;

  if (!attributeMap) {
    attributeMap = {};
  }

  this._tag = tag;
  this._attributeMap = attributeMap;
  this._selector = selector;
  this._invertedAttributeMap = {};
  _.each(attributeMap, function(attribute_value, attribute_name) {
    element._invertedAttributeMap[element._getDataKey(attribute_value)] = attribute_name;
  });

  if (!data) {
    data = {};
  }

  var attributes = {};
  _.each(attributeMap, function(attribute_value, attribute_name) {
    var dataKey = element._getDataKey(attribute_value);
    if (dataKey) {
      if (data[dataKey]) {
        attributes[attribute_name] = data[dataKey];
      }
    }
    else {
      attributes[attribute_name] = attribute_value;
    }
  });

  this._attributes = attributes;
};

_.extend(module.exports.prototype, {

  /**
   * Gets the html tag name of the element.
   *
   * @return {string}
   *   The html tag name.
   */
  getTag: function() {
    return this._tag;
  },

  /**
   * Gets the attributes of the element.
   *
   * @return {object}
   *   A map where keys are attribute names and values are the associated
   *   attribute values.
   */
  getAttributes: function() {
    return this._attributes;
  },

  /**
   * Gets the names of the attributes this element supports.
   *
   * @return {array}
   *   An array of attribute names.
   */
  getAttributeNames: function() {
    return _.keys(this._attributeMap);
  },

  /**
   * Sets the value of an attribute.
   *
   * @param {string} name
   *   Either a hard coded attribute name or a data reference name if the form
   *   '<datakeyname>'.
   * @param {string} value
   *   The attribute value. Note that only strings are supported here.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  setAttribute: function(name, value) {
    this._attributes[this.getAttributeName(name)] = value;
    return this;
  },

  /**
   * Gets the value of an attribute on this element instance.
   *
   * @param {string} name
   *   Either a hard coded attribute name or a data reference name if the form
   *   '<datakeyname>'.
   *
   * @return {string}
   *   The attribute value for the requested attribute.
   */
  getAttribute: function(name) {
    return this._attributes[this.getAttributeName(name)];
  },

  /**
   * Gets the name of an attribute based on its data key entry name.
   *
   * @param {string} name
   *   A data key entry name in the form '<datakeyname>'.
   *
   * @return {string}
   *   The name of the attribute. Passes through the originally passed name
   *   if no data key match was found.
   */
  getAttributeName: function(name) {
    var dataKey = this._getDataKey(name);
    if (dataKey && this._invertedAttributeMap[dataKey]) {
      name = this._invertedAttributeMap[dataKey];
    }
    return name;
  },

  /**
   * Renders the opening tag for the element.
   *
   * @return {string}
   *   The rendered opening tag.
   */
  renderOpeningTag: function() {
    var result = '<' + this.getTag();

    _.each(this.getAttributes(), function(value, name) {
      result += ' ' + name + '="' + value + '"';
    });

    return result + '>';
  },

  /**
   * Renders the closing tag for the element.
   *
   * @return {string}
   *   The rendered closing tag.
   */
  renderClosingTag: function() {
    return '</' + this.getTag() + '>';
  },

  /**
   * Gets the selector for finding instances of this element in the DOM.
   *
   * @return {string}
   *   The selector for this element.
   */
  getSelector: function() {
    var attributes = this.getAttributes();
    var selector = '';

    if (this._selector) {
      selector = this._selector;
    }
    else if (attributes['class']) {
      var classes = attributes['class'].split(' ');
      _.each(classes, function(classname) {
        selector += '.' + classname;
      }, this);
    }
    else {
      selector = this.getTag();
    }

    return selector;
  },

  /**
   * Helper function to parse data key attribute names.
   *
   * @param {string} name
   *   The attribute name to be parsed.
   *
   * @return {string}
   *   The data key attribute name (without enclosing '<>') if the attribute
   *   name matched the pattern, false otherwise.
   */
  _getDataKey: function(name) {
    var regex = /^<([a-z\-]+)>$/;
    var parsed = regex.exec(name);
    if (parsed && parsed[1]) {
      return parsed[1];
    }
    else {
      return false;
    }
  }

});

},{}],20:[function(require,module,exports){
/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

'use strict';

var _ = window._             ,
  Element = require('./Element');

/**
 * A factory for creating Element objects.
 *
 * @param {object} elements
 *   Definitions of element types that can be created by this factory.
 *
 * @constructor
 */
module.exports = function(elements) {
  this._elements = elements;

  _.each(this._elements, function(element) {
    if (!element.attributes) {
      element.attributes = {};
    }
  });
};

_.extend(module.exports.prototype, {

  /**
   * Creates an element object with no data.
   *
   * @param {string} name
   *   The type of element to get a template for.
   *
   * @return {Element}
   *   The created element object, with no additional data.
   */
  getTemplate: function(name) {
    return this.create(name);
  },

  /**
   * Creates an element instance with specific data attributes.
   *
   * @param {string} name
   *   The type of element to created as defined in the constructor.
   * @param {object} data
   *   The data to use to fill in the element attributes based on the type
   *   definition.
   *
   * @return {Element}
   *   The created element object, with the passed attribute data filled in.
   */
  create: function(name, data) {
    var template = this._elements[name];
    if (!template) {
      throw new Error('Invalid element type.');
    }
    return new Element(template.tag, template.attributes, template.selector, data);
  }

});

},{"./Element":19}],21:[function(require,module,exports){
/**
 * @file
 * Provides a model for representing a context.
 */

'use strict';

var Backbone = window.Backbone    ,
  EditBufferItemCollection = require('../Collections/EditBufferItemCollection');

/**
 * Backbone Model for representing editor widget contexts.
 *
 * A context is an environment where widgets can appear. Contexts let us know
 * who owns the data it's associated with. Each editable region will get its
 * own context. When a widget travels from one context to another it flags that
 * the data entity that is associated with the widget needs to be updated.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.Model.extend({

  type: 'Context',

  defaults: {
    ownerId: '',
    fieldId: '',
    schemaId: '',
    settings: {},
  },

  /**
   * @inheritdoc
   */
  constructor: function(attributes, options) {
    this.editBuffer = new EditBufferItemCollection([], { contextId: attributes.id });
    Backbone.Model.apply(this, [attributes, options]);
  },

  /**
   * @inheritdoc
   */
  set: function(attributes, options) {
    if (attributes.editBufferItems) {
      this.editBuffer.add(attributes.editBufferItems, {merge: true});
      delete attributes.editBufferItems;
    }

    var oldId = this.get('id');
    var newId = attributes.id;
    if (newId && oldId && newId != oldId) {
      var collection = this.collection;
      if (collection) {
        collection.remove(this, { silent: true });
        this.attributes.id = this.id = newId;
        collection.add(this, { silent: true });
        this.attributes.id = this.id = oldId;
      }
    }

    Backbone.Model.prototype.set.call(this, attributes, options);
  },

  /**
   * A convenience function for reading an individual setting.
   *
   * @param {string} key
   *   The settings key to lookup.
   *
   * @return {mixed}
   *   The setting value that was read or undefined if no such setting existed.
   */
  getSetting: function(key) {
    return this.get('settings')[key];
  },

});

},{"../Collections/EditBufferItemCollection":6}],22:[function(require,module,exports){
/**
 * @file
 * A Backbone model for representing edit buffer items.
 */

'use strict';

var Backbone = window.Backbone    ;

/**
 * Backbone  Model for representing commands.
 *
 * The id for this model is the uuid of a data entity that the item
 * corresponds to.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.Model.extend({

  type: 'EditBufferItem',

  /**
   * @type {object}
   *
   * @prop markup
   */
  defaults: {

    'contextId': '',

    /**
     * Whether or not the item is ready to be inserted.
     *
     * @type {string}
     */
    'insert': false,

    /**
     * The item markup.
     *
     * @type {string}
     */
    'markup': '...',

    /**
     * The item markup.
     *
     * @type {string}
     */
    'type': '',

    'fields': {}
  },

});

},{}],23:[function(require,module,exports){

'use strict';

var Backbone = window.Backbone    ;

/**
 */
module.exports = Backbone.Model.extend({

  type: 'Editor',

  /**
   * @inheritdoc
   */
  initialize: function(attributes, config) {
    this.widgetFactory = config.widgetFactory;
    this.viewFactory = config.viewFactory;
    this.widgetStore = config.widgetStore;
    this.editBufferMediator = config.editBufferMediator;
    this.context = config.context;
    this.contextResolver = config.contextResolver;
    this.listenTo(this.context, 'change:id', this._updateContextId);
  },

  /**
   * @inheritdoc
   */
  destroy: function() {
    this.stopListening();
    this.widgetStore.cleanup();
    this.editBufferMediator.cleanup();
  },

  /**
   * Change handler for a context id change.
   *
   * @param {Backbone.Model} contextModel
   *   The context model that has had an id change.
   *
   * @return {void}
   */
  _updateContextId: function(contextModel) {
    this.set({ id: contextModel.get('id') });
  }

});

},{}],24:[function(require,module,exports){
/**
 * @file
 * A Backbone model for representing a schema entry.
 */

'use strict';

var Backbone = window.Backbone    ;

/**
 * Backbone  Model for representing a schema entry.
 *
 * The id for this model is the uuid of a data entity that the item
 * corresponds to.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.Model.extend({

  type: 'Schema',

  /**
   * @type {object}
   *
   * @prop markup
   */
  defaults: {

    'allowed': {},
  },

  /**
   * Determines if a type is allowed within a schema.
   *
   * @param {string} type
   *   The type to test validity for.
   *
   * @return {bool}
   *   True if the type is allowed within the schema node, false otherwise.
   */
  isAllowed: function(type) {
    return !!this.get('allowed')[type];
  },

});

},{}],25:[function(require,module,exports){
/**
 * @file
 * A Backbone model for representing editor widgets.
 */

'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ;

var State = {
  READY: 0x01,
  DESTROYED_WIDGET: 0x02,
  DESTROYED_REFS: 0x04,
  DESTROYED: 0x06,
};

/**
 * Backbone  Model for representing editor widgets.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.Model.extend({

  type: 'Widget',

  /**
   * @type {object}
   *
   * @prop markup
   */
  defaults: {

    /**
     * The context the widget is in.
     *
     * @type {string}
     */
    contextId: '',

    /**
     * The data to be sent with the command.
     *
     * @type {int}
     */
    itemId: 0,

    /**
     * The data to be sent with the command.
     *
     * @type {int}
     */
    itemContextId: '',

    /**
     * The internal markup to display in the widget.
     *
     * @type {string}
     */
    markup: '',

    /**
     * The data to be sent with the command.
     *
     * @type {object}
     */
    edits: {},

    /**
     * Whether or not the referenced edit buffer item is being duplicated.
     *
     * @type {bool}
     */
    duplicating: false,

    /**
     * The destruction state for the widget.
     *
     * @type {int}
     */
    state: State.READY,
  },

  /**
   * @inheritdoc
   */
  constructor: function (attributes, options) {
    this.widget = options.widget;
    this._editBufferItemRefFactory = options.editBufferItemRefFactory;
    this._contextResolver = options.contextResolver;
    Backbone.Model.apply(this, [attributes, options]);
  },

  /**
   * @inheritdoc
   */
  set: function(attributes, options) {
    this._filterAttributes(attributes);
    return Backbone.Model.prototype.set.call(this, attributes, options);
  },

  /**
   * Triggers a request to edit the referenced edit buffer item.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  edit: function() {
    this.editBufferItemRef.edit(this.get('edits'));
    return this;
  },

  /**
   * Triggers a request to duplicate the referenced edit buffer item.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  duplicate: function() {
    this.set({ duplicating: true });
    this.editBufferItemRef.duplicate(this.get('id'), this.get('edits'));
    return this;
  },

  /**
   * @inheritdoc
   */
  destroy: function(options) {
    // If the widget has not already been marked as destroyed we trigger a
    // destroy event on the widget collection so it can instruct anything that
    // references this widget to clean it out. Redundant destroy calls are
    // ignored.
    if (!this.hasState(State.DESTROYED)) {
      this.trigger('destroy', this, this.collection, options);
      this.setState(State.DESTROYED);
    }
    return this;
  },

  /**
   * Updates the destruction state for this widget.
   *
   * @param {WidgetModel.State} state
   *   The state to set on the widget model.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  setState: function(state) {
    return this.set({state: this.get('state') | state});
  },

  /**
   * Checks the destruction state for this widget.
   *
   * @param {WidgetModel.State} state
   *   The state to check for.
   *
   * @return {bool}
   *   True of the model has the provided state set, false otherwise.
   */
  hasState: function(state) {
    return (this.get('state') & state) === state;
  },

  /**
   * Applies attribute filtering for 'set' method calls.
   *
   * @param {object} attributes
   *   The attributes that need to be filtered.
   *
   * @return {void}
   */
  _filterAttributes: function(attributes) {
    // Run the change handler to rebuild any references to external models
    // if necessary. We do this here instead of on('change') to ensure that
    // subscribed external listeners get consistent atomic change
    // notifications.
    if (this._refreshEditBufferItemRef(attributes) || attributes.edits) {
      this._setupListeners(attributes);
    }
  },

  /**
   * Internal function to handle changes to the referenced edit buffer item.
   *
   * @param {object} attributes
   *   An attributes object to parse for changes that could have side-effects.
   *
   * @return {bool}
   *   True if the changes in the attributes object signaled that this model
   *   needs to start listening to new objects, false otherwise.
   */
  _refreshEditBufferItemRef: function(attributes) {
    // Track whether we need to update which referenced models we are
    // listening to.
    var setupListeners = false;

    // Get the consolidated list of old / updated properties to check for
    // changes.
    var oldItemContext = this.get('itemContextId');
    var oldWidgetContext = this.get('contextId');
    var oldItemId = this.get('itemId');
    var newItemContext = attributes.itemContextId ? attributes.itemContextId : oldItemContext;
    var newWidgetContext = attributes.contextId ? attributes.contextId : oldWidgetContext;
    var newItemId = attributes.itemId ? attributes.itemId : oldItemId;

    // If the context the buffer item has changed, the context of the widget
    // has changed, or the referenced edit buffer item id has changed we need
    // to regenerate the edit buffer item reference and instruct the caller to
    // update the models this widget is listening to.
    if (newItemContext != oldItemContext || newWidgetContext != oldWidgetContext || newItemId != oldItemId) {
      this.editBufferItemRef = this._editBufferItemRefFactory.createFromIds(newItemId, newItemContext, newWidgetContext);
      setupListeners = true;
      attributes.markup = this.editBufferItemRef.editBufferItem.get('markup');
    }

    return setupListeners;
  },

  /**
   * Removes any stale listeners and sets up fresh listeners.
   *
   * @param {object} attributes
   *   An attributes object to use to determine which related models need to be
   *   listened to.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  _setupListeners: function(attributes) {
    this.stopListening()
      .listenTo(this.editBufferItemRef.editBufferItem, 'change:markup', this._readFromBufferItem)
      .listenTo(this.editBufferItemRef.sourceContext, 'change:id', this._updateContext)
      .listenTo(this.editBufferItemRef.targetContext, 'change:id', this._updateContext);

    _.each(attributes.edits, function(value, contextString) {
      var context = this._contextResolver.get(contextString);
      this.listenTo(context, 'change:id', this._updateContext);
    }, this);

    return this;
  },

  /**
   * Internal function to copy updates from the referenced buffer item.
   *
   * @param {Backbone.Model} bufferItemModel
   *   The buffer item model to copy markup changes from.
   *
   * @return {void}
   */
  _readFromBufferItem: function(bufferItemModel) {
    this.set({markup: bufferItemModel.get('markup')});
  },

  /**
   * Internal function to handle when a referenced context id has changed.
   *
   * @param {Backbone.Model} contextModel
   *   The context model that has had an id attribute changed.
   *
   * @return {void}
   */
  _updateContext: function(contextModel) {
    var oldId = contextModel.previous('id');
    var newId = contextModel.get('id');
    var attributes = {};

    // Update any context id references that may need to change.
    if (this.get('itemContextId') == oldId) {
      attributes.itemContextId = newId;
    }
    if (this.get('contextId') == oldId) {
      attributes.contextId = newId;
    }

    // If the context was referenced by an edit on the model, update the edit.
    var edits = this.get('edits');
    if (edits[oldId]) {
      attributes.edits = {};
      _.each(edits, function(value, contextString) {
        if (contextString == oldId) {
          attributes.edits[newId] = value.replace(oldId, newId);
        }
        else {
          attributes.edits[contextString] = value;
        }
      }, this);
    }

    this.set(attributes);
    this.trigger('rebase', this, oldId, newId);
  },

});

module.exports.State = State;

},{}],26:[function(require,module,exports){
/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ,
  unimplemented = require('../unimplemented');

/**
 * A base for editor adapter plugins.
 *
 * Adapter plugins are the glue that translates data mutations within the
 * widget binder library into a specific editor's API calls. As long as an
 * editor uses the DOM as the primary method of storage, the widget binder
 * library can handle most of the mutations without editor specific code. Each
 * editor may have its own flavor of DOM wrappers and inline editing handling,
 * so this plugin is required to bridge the gap between the editor's API and
 * the data operations.
 *
 * @constructor
 */
module.exports = function() {
};

_.extend(module.exports.prototype, Backbone.Events, {

  /**
   * Inserts an embed code into the editor.
   *
   * This should insert the newly created element at the current editable cursor
   * position within the editor.
   *
   * @param {Element} embedCode
   *   The embed code element to be inserted.
   *
   * @return {void}
   */
  insertEmbedCode: function(embedCode) {
    unimplemented(embedCode);
  },

  /**
   * Removes a widget from the editor.
   *
   * This should remove the widget based on its unique id and free any
   * associated memory.
   *
   * @param {int} id
   *   The id of the widget to be destroyed.
   *
   * @return {void}
   */
  destroyWidget: function(id) {
    unimplemented(id);
  },

  /**
   * Sets up an inline editable field within a widget.
   *
   * The widgetView parameter gives the adapter access to the DOM element that
   * should be inline-editable. The contextId allows access to the current
   * inline edits for the particular context, and the selector is a jQuery style
   * selector dictating which node in the widgetView DOM will become
   * inline-editable.
   *
   * @param {Backbone.View} widgetView
   *   The view for the widget that contains the field that will become
   *   editable.
   * @param {mixed} contextId
   *   The context id to of the field that should become inline editable. Each
   *   editable field defines a unique context for its children.
   * @param {string} selector
   *   A jQuery style selector for specifying which element within the widget
   *   should become editable. The selector is relative to the view's root el
   *   property.
   *
   * @return {void}
   */
  attachInlineEditing: function(widgetView, contextId, selector) {
    unimplemented(widgetView, contextId, selector);
  },

  /**
   * Reads the inline edit for an editable widget field from the widget's DOM.
   *
   * @param {Backbone.View} widgetView
   *   The view for the widget that contains the field to read inline edits
   *   from.
   * @param {mixed} contextId
   *   The context id to read the inline edit from.
   * @param {string} selector
   *   A jQuery style selector for specifying which element within the widget
   *   should the inline edits should be read from. The selector is relative to
   *   the view's root el property.
   *
   * @return {string}
   *   The processed inline edit markup for the specified contextId.
   */
  getInlineEdit: function(widgetView, contextId, selector) {
    return unimplemented(widgetView, contextId, selector);
  },

  /**
   * Gets the root DOM element for the editor.
   *
   * This method tells the editor how to 
   *
   * @return {DOMElement}
   *   The root DOM element for the editor.
   */
  getRootEl: function() {
    return unimplemented();
  },

  /**
   * An optional method for performing any cleanup after tracker destruction.
   *
   * This will be called when the widget tracker has been destroyed. It is
   * usually not necessary to implement this method.
   *
   * @return {void}
   */
  cleanup: function() {
    this.stopListening();
  }

});

module.exports.extend = Backbone.Model.extend;

},{"../unimplemented":38}],27:[function(require,module,exports){
/**
 * @file
 * Provides an interface for protocol plugins.
 */

'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ,
  unimplemented = require('../unimplemented');

/**
 * A base for protocol plugins.
 *
 * Protocol plugins handle the request / response mechanism for syncing data to
 * and from the server. They provide a single method 'send' that will be called
 * when requests are dispatched.
 *
 * The command resolver is used to pass the response back into the tracking
 * system asynchronously.
 *
 * @constructor
 */
module.exports = function() {
};

_.extend(module.exports.prototype, {

  /**
   * Sends a request to the data store.
   *
   * This method should initiate a request, then call resolver.resolve(data)
   * with the response.
   * 
   * The data object passed to resolve() may contain one or more of: 'context',
   * 'widget', 'editBufferItem', 'schema'. Each entry should be a data model
   * keyed by the id of the data model.
   *
   * @param {string} type
   *   The request type. This can be one of: 'INSERT_ITEM', 'RENDER_ITEM',
   *   'DUPLICATE_ITEM', 'FETCH_SCHEMA'.
   * @param {object} data
   *   The data to be sent in the request.
   * @param {SyncActionResolver} resolver
   *   The resolver service that will be used to resolve the command.
   *
   * @return {void}
   */
  send: function(type, data, resolver) {
    unimplemented(type, data, resolver);
  }

});

module.exports.extend = Backbone.Model.extend;

},{"../unimplemented":38}],28:[function(require,module,exports){

'use strict';

var _ = window._             ;

/**
 * A central dispatcher for sending commands to the canonical data store.
 *
 * Default Supported Actions:
 *
 *   INSERT_ITEM: Requests a new edit buffer item from the data store. This
 *   triggers the creation of an edit buffer item on the server, and should
 *   resolve with the new item.
 *
 *   EDIT_ITEM: Requests that an existing edit buffer item be edited. This
 *   triggers an edit flow on the server. The actual details of that flow are
 *   not enforced. For example, the server may deliver back an ajax form for the
 *   edit buffer item and resolve the action once that form is submitted. The
 *   resolution should include the updates made to the edit buffer item model.
 *
 *   RENDER_ITEM: Requests the representational markup for a data entity that
 *   will be rendered in the editor viewmode. The command should resolve with
 *   the edit buffer item model containing the updated markup. This markup will
 *   automatically be synced to the widget. The markup can also contain inline
 *   editable fields in the format specified by the sync configuration.
 *
 *   DUPLICATE_ITEM: Requests that an item be duplicated in the store, resulting
 *   in a newly created item. This command should resolve with the newly created
 *   edit buffer model.
 *
 *   FETCH_SCHEMA: Requests the schema for a field from the server. This should
 *   resolve with a schema model detailing which other types of fields can be
 *   nested inside the given field type.
 *
 * @param {SyncProtocol} protocol
 *   A protocol plugin for handling the request / response transaction.
 * @param {SyncActionResolver} resolver
 *   The resolver service for processing sync action responses.
 *
 * @constructor
 */
module.exports = function(protocol, resolver) {
  this._protocol = protocol;
  this._resolver = resolver;
};

_.extend(module.exports.prototype, {

  /**
   * Dispatches a sync action.
   *
   * @param {string} type
   *   Should be one of: 'INSERT_ITEM', 'EDIT_ITEM', 'RENDER_ITEM',
   *   'DUPLICATE_ITEM', 'FETCH_SCHEMA'.
   * @param {object} data
   *   Arbitrary data representing the request.
   *
   * @return {void}
   */
  dispatch: function(type, data) {
    this._protocol.send(type, data, this._resolver);
  }

});

},{}],29:[function(require,module,exports){

'use strict';

var _ = window._             ;

/**
 * A class for resolving dispatched actions.
 *
 * Dispatched actions are resolved by checking the response for models that
 * should be added to the appropriate collection.
 *
 * The resolver service is set up with a mappings of models-to-collections and
 * uses this mapping to update the associated collection when it sees a model
 * that has been mapped.
 *
 * @constructor
 */
module.exports = function() {
  this._collections = {};
};

_.extend(module.exports.prototype, {

  /**
   * Adds a model-to-collection map.
   *
   * This map is used to add models in the response to the appropriate
   * colleciton.
   *
   * @param {string} modelName
   *   The key in the response object that contains a model to be added to the
   *   specified collection.
   * @param {mixed} collectionCallback
   *   If the passed value is a Backbone.Collection, models in the response will
   *   be added directly to this collection. If the passed value is a function,
   *   the callback function will be called with the model attributes in the
   *   response and should return the resolved collection. The model will be
   *   added to the resolved collection in this case.
   *
   * @return {void}
   */
  addCollection: function(modelName, collectionCallback) {
    this._collections[modelName] = collectionCallback;
  },

  /**
   * Resolves a dispatched sync action.
   *
   * @param {object} response
   *   A plain javascript object that contains the action response. Keys in this
   *   object should be model names as passed to the addCollection method. The
   *   values in this object should be models to be added to the associated
   *   collection. Each entry in the object should contain a javascript object,
   *   keyed by the model's id, and containg the model attributes to be set in
   *   the collection as a value.
   *
   *   [
   *    {
   *      type: 'asset',
   *      id: '',
   *      attributes: '',
   *    },
   *   ]
   *
   * @return {void}
   */
  resolve: function(response) {
    _.each(response, function(model) {
      if (this._collections[model.type]) {
        this._updateModel(model, this._collections[model.type]);
      }
    }, this);
  },

  /**
   * Adds models to a collection.
   *
   * @param {object} model
   *   An object where keys are model ids and values are model attributes.
   * @param {mixed} collection
   *   Can either be a Backbone.Collection to add the model to, or a callback
   *   which returns the collection.
   *
   * @return {void}
   */
  _updateModel: function(model, collection) {
    var resolvedCollection = collection;

    // If a function is passed as the collection, we call it to resolve the
    // actual collection for this model.
    if (typeof collection == 'function') {
      resolvedCollection = collection(model.attributes);
    }

    // We first try to load the existing model instead of directly setting the
    // model in collection since it is completely valid for a model's id to
    // change.
    var existing = resolvedCollection.get(model.id);
    if (existing) {
      existing.set(model.attributes);
    }
    else {
      if (!model.attributes.id) {
        model.attributes.id = model.id;
      }
      resolvedCollection.add(model.attributes);
    }
  }

});

},{}],30:[function(require,module,exports){

'use strict';

var _ = window._             ;

/**
 * @inheritdoc
 */
module.exports = function(elementFactory, markup, actions) {
  var displayElement = elementFactory.create('widget-display');
  var toolbarElement = elementFactory.create('toolbar');
  var toolbarItemElement = elementFactory.create('toolbar-item');
  var commandElement = elementFactory.create('widget-command');

  var result = displayElement.renderOpeningTag()
    + markup
    + toolbarElement.renderOpeningTag();

  _.each(actions, function(def, id) {
    result += toolbarItemElement.renderOpeningTag()
      + commandElement.setAttribute('<command>', id).renderOpeningTag() + def.title + commandElement.renderClosingTag()
      + toolbarItemElement.renderClosingTag();
  });

  result += toolbarElement.renderClosingTag()
    + displayElement.renderClosingTag();

  return result;
};

},{}],31:[function(require,module,exports){

'use strict';

var _ = window._             ;

/**
 * @inheritdoc
 */
module.exports = function(elementFactory, fields, edits) {
  var result = '';

  if (fields) {
    _.each(fields, function(node) {
      var element = elementFactory.create(node.type, node);
      var edit; 

      if (node.type == 'field') {
        if (node.context) {
          edit = edits[node.context];
          element.setAttribute('<editable>', 'true');
        }
        else {
          element.setAttribute('<editable>', 'false');
        }
      }

      result += element.renderOpeningTag();

      if (edit) {
        result += edit;
      }
      else {
        result += module.exports(elementFactory, node.children, edits);
      }

      result += element.renderClosingTag();
    });
  }

  return result;
};

},{}],32:[function(require,module,exports){
/**
 * @file
 * A Backbone view for wrapping context containing DOM nodes.
 */

'use strict';

var Backbone = window.Backbone    ;

/**
 * Backbone view for updating the editor element.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.View.extend({

  /**
   * @inheritdoc
   */
  initialize: function(attributes, options) {
    if (!options.elementFactory) {
      throw new Error('Required elementFactory option missing.');
    }

    this._elementFactory = options.elementFactory;

    this.listenTo(this.model, 'change:id', this.render);
    this.listenTo(this.model, 'destroy', this.stopListening);
    this.render();
  },

  /**
   * Renders the editor element.
   *
   * This just exists to keep the context attribute in sync with the data
   * model. This should *never* change the actual contents of the view element.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  render: function() {
    var template = this._elementFactory.getTemplate('field');
    this.$el.attr(template.getAttributeName('<context>'), this.model.get('context'));
    this.trigger('DOMMutate', this, this.$el);
  },

});

},{}],33:[function(require,module,exports){
/**
 * @file
 * A Backbone view for representing widgets within the editor.
 */

'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ,
  $ = Backbone.$,
  WidgetView = require('./WidgetView'),
  unimplemented = require('../unimplemented');

/**
 * Backbone view for representing widgets within the editor.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = WidgetView.extend({

  processingIndicator: '...',

  actions: {
    edit: {
      title: 'Edit',
      callback: function() {
        this.save().edit();
      }
    },
    remove: {
      title: 'Remove',
      callback: function() {
        this.remove();
      }
    }
  },

  /**
   * @inheritdoc
   */
  initialize: function(options) {
    WidgetView.prototype.initialize.call(this, options);

    if (options.processingIndicator) {
      this.processingIndicator = options.processingIndicator;
    }

    var widgetCommandTemplate = this._elementFactory.getTemplate('widget-command');
    this.commandSelector = widgetCommandTemplate.getSelector();
    this.commandAttribute = widgetCommandTemplate.getAttributeName('<command>');

    // Set up the change handler.
    this.listenTo(this.model, 'change', this._changeHandler);
    this.listenTo(this.model, 'rebase', this._rebase);

    this._stale = {};
  },

  /**
   * @inheritdoc
   *
   * @param {ElementFactory} elementFactory
   *   The element factory that will be used to create element templates.
   * @param {string} markup
   *   The markup to be rendered for the widget.
   * @param {object} actions
   *   A mapping where each key is an action name, and each entry is an object
   *   containing the following entries:
   *    - title: The title to display to the user.
   *    - callback: The callback for when the action is triggered.
   */
  template: function(elementFactory, markup, actions) {
    unimplemented(elementFactory, markup, actions);
  },

  /**
   * @inheritdoc
   *
   * @param {string} mode
   *   One of:
   *     - 'duplicating': Re-renders the entire view with the duplicating
   *       indicator.
   *     - 'container': Re-renders the container while preserve the existing
   *       inline editable DOM. This effectively re-renders the container
   *       without triggering a re-render
   *     - 'attributes': Re-renders the top-level attributes only.
   *     - 'all': Re-renders everything. This will wipe out the structure of
   *       any existing edits and sub-widgets, so it's really only suitable
   *       when the markup is completely stale. Usually, 'container' is a
   *       better option.
   *   If no mode is provided 'all' is used by default.
   */
  render: function(mode) {
    this._find(this.commandSelector).off();

    switch (mode) {
      case 'duplicating':
        this._renderDuplicating();
        break;

      case 'container':
        this._renderContainer();
        break;

      case 'attributes':
        this._renderAttributes();
        break;

      default:
        this._renderAll();
    }

    this._cleanupStaleEditables();
    this.trigger('DOMRender', this, this.$el);
    this.trigger('DOMMutate', this, this.$el);

    return this;
  },

  /**
   * Triggers an edit command dispatch.
   *
   * @return {void}
   */
  edit: function() {
    this.model.edit();
  },

  /**
   * Cleans up the view and triggers the destruction of the associated widget.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  remove: function() {
    this.stopListening();
    if (this.model) {
      this.trigger('DOMRemove', this, this.$el);
      this._cleanupStaleEditables(true);
      var model = this.model;
      this.model = null;
      model.destroy();
    }
    return this;
  },

  /**
   * @inheritdoc
   */
  stopListening: function() {
    // Cleanup the command listeners. @see _renderCommands.
    this._find(this.commandSelector).off();
    return WidgetView.prototype.stopListening.apply(this, arguments);
  },

  /**
   * Returns whether or not the editor view has been rendered.
   *
   * @return {bool}
   *   True if the editor view has been rendered on the roow element of the
   *   view, false otherwise.
   */
  isEditorViewRendered: function() {
    return this.$el.attr(this.viewModeAttribute) == 'editor';
  },

  /**
   * Renders the widget indicating the data entity is being duplicated.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  _renderDuplicating: function() {
    this.trigger('DOMRemove', this, this.$el.children());
    this.$el.html(this.template(this._elementFactory, this.processingIndicator, this.actions));
    return this;
  },

  /**
   * Renders the markup for a widget while preserving the inline editable DOM.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  _renderContainer: function() {
    var domEdits = {};
    this._inlineElementVisitor(function($el, contextString) {
      domEdits[contextString] = $el.contents();
    });

    var $oldContainer = $('<div></div>');
    var $newContainer = $('<div></div>');
    var $oldChildren = this.$el.children();
    this.$el.append($oldContainer);
    this.$el.append($newContainer);

    $oldContainer.append($oldChildren);
    $newContainer.html(this.template(this._elementFactory, this.model.get('markup'), this.actions)); 
    this._find(this.inlineEditorSelector, $oldContainer).attr(this.inlineContextAttribute, '');

    this._inlineElementVisitor(function($el, contextString, selector) {
      this._adapter.attachInlineEditing(this, contextString, selector);

      if (domEdits[contextString]) {
        $el.html('').append(domEdits[contextString]);
      }
    }, $newContainer);

    this.$el.append($newContainer.children());
    this.trigger('DOMRemove', this, $oldContainer);
    $oldContainer.remove();
    $newContainer.remove();

    return this._renderAttributes()._renderCommands();
  },

  /**
   * Renders everything, indiscriminately destroy the existing DOM (and edits).
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  _renderAll: function() {
    this.trigger('DOMRemove', this, this.$el.children());
    this.$el.html(this.template(this._elementFactory, this.model.get('markup'), this.actions));

    var edits = this.model.get('edits');
    this._inlineElementVisitor(function($el, contextString, selector) {
      if (edits[contextString]) {
        $el.html(edits[contextString] ? edits[contextString] : '');
      }

      this._adapter.attachInlineEditing(this, contextString, selector);
    });

    return this._renderAttributes()._renderCommands();
  },

  /**
   * Re-renders just the attributes on the root element.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  _renderAttributes: function() {
    var element = this._elementFactory.create('widget', {
      context: this.model.get('contextId'),
      uuid: this.model.get('itemId'),
      viewmode: 'editor',
    });

    _.each(element.getAttributes(), function(value, name) {
      this.$el.attr(name, value);
    }, this);

    this.trigger('DOMMutate', this, this.$el);

    return this;
  },

  /**
   * Attaches click handlers for firing commands.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  _renderCommands: function() {
    var view = this;
    this._find(this.commandSelector).on('click', function() {
      var action = $(this).attr(view.commandAttribute);
      view.actions[action].callback.call(view);
    });
    return this;
  },

  /**
   * Handles changes to the widget model and invokes the appropriate renderer.
   *
   * @return {void}
   */
  _changeHandler: function() {
    if (this.model.previous('duplicating')) {
      this.render();
    }
    else if (this.model.get('duplicating')) {
      this.render('duplicating');
    }
    else if (this.model.hasChanged('markup')) {
      this.render('container');
    }
    else if (this.model.hasChanged('itemId') || this.model.hasChanged('contextId')) {
      this._render('attributes');
    }

    return this;
  },

  /**
   * Reacts to a context rebase event by updating the associated DOM element.
   *
   * @see WidgetModel
   *
   * @param {Backbone.Model} model
   *   The changed model.
   * @param {string} oldId
   *   The old context id.
   * @param {string} newId
   *   The new context id.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  _rebase: function(model, oldId, newId) {
    if (!model) {
      model = this.model;
    }

    this._inlineElementVisitor(function($el, contextString) {
      if (contextString == oldId) {
        $el.attr(this.inlineContextAttribute, newId);
        this.trigger('DOMMutate', this, $el);
      }
    });
    this._stale[oldId] = true;

    return this;
  },

  /**
   * Allows the editor implementation to free inline editing data structures.
   *
   * @param {bool} hard
   *   Whether or not to force all inline editables to be destroyed. Defaults
   *   to false.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  _cleanupStaleEditables: function(hard) {
    if (hard) {
      this._inlineElementVisitor(function($el, contextId, selector) {
        this._adapter.detachInlineEditing(this, contextId, selector);
      });
    }
    else {
      _.each(this._stale, function(unused, contextId) {
        var selector = this._inlineElementSelector(contextId);
        this._adapter.detachInlineEditing(this, contextId, selector);
      }, this);
    }

    this._stale = {};

    return this;
  },

});

},{"../unimplemented":38,"./WidgetView":35}],34:[function(require,module,exports){
/**
 * @file
 * A Backbone view for representing the exported data state of a widget.
 */

'use strict';

var _ = window._             ,
  WidgetView = require('./WidgetView'),
  unimplemented = require('../unimplemented');

module.exports = WidgetView.extend({

  /**
   * @inheritdoc
   */
  initialize: function(options) {
    WidgetView.prototype.initialize.call(this, options);

    this.attributeWhitelist = _.invert(this.widgetTemplate.getAttributeNames());
    delete this.attributeWhitelist[this.widgetTemplate.getAttributeName('<viewmode>')];
  },

  /**
   * @inheritdoc
   *
   * @param {ElementFactory} elementFactory
   *   The factory used to create DOM element templates.
   * @param {object} fields
   *   A map of the field / data structure of the widget to output tags for.
   * @param {object} edits
   *   A map of context ids to inline edits that have been made for that
   *   context.
   */
  template: function(elementFactory, fields, edits) {
    unimplemented(elementFactory, fields, edits);
  },

  /**
   * @inheritdoc
   */
  render: function() {
    var view = this;
    var fields = this.model.editBufferItemRef.editBufferItem.get('fields');
    var edits = this.model.get('edits');
    this.$el.html(this.template(this._elementFactory, fields, edits));
    _.each(this.el.attributes, function(attr) {
      if (_.isUndefined(view.attributeWhitelist[attr.name])) {
        view.$el.removeAttr(attr.name);
      }
    });
    return this;
  },

});

},{"../unimplemented":38,"./WidgetView":35}],35:[function(require,module,exports){
/**
 * @file
 * Provides a model for representing widgets.
 */

'use strict';

var Backbone = window.Backbone    ,
  $ = Backbone.$,
  unimplemented = require('../unimplemented');

/**
 * Backbone view for representing widgets within the editor.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.View.extend({

  /**
   * @inheritdoc
   */
  initialize: function(options) {
    if (!options.adapter) {
      throw new Error('Required adapter option missing.');
    }

    if (!options.elementFactory) {
      throw new Error('Required elementFactory option missing.');
    }

    if (!options.template) {
      throw new Error('Required template option missing.');
    }

    this._adapter = options.adapter;
    this._elementFactory = options.elementFactory;
    this.template = options.template;

    // Get a list of templates that will be used.
    this.widgetTemplate = this._elementFactory.getTemplate('widget');
    this.fieldTemplate = this._elementFactory.getTemplate('field');
    this.widgetCommandTemplate = this._elementFactory.getTemplate('widget-command');

    // Set up attribute / element selectors.
    this.widgetSelector = this.widgetTemplate.getSelector();
    this.viewModeAttribute = this.widgetTemplate.getAttributeName('<viewmode>');
    this.inlineContextAttribute = this.fieldTemplate.getAttributeName('<context>');
    this.inlineEditorSelector = this.fieldTemplate.getSelector();
  },

  /**
   * Generates the HTML content for the root element.
   *
   * @return {string}
   *   The html markup to apply inside the root element.
   */
  template: function() {
    unimplemented();
  },

  /**
   * Renders the widget.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  render: function() {
    unimplemented();
  },

  /**
   * Saves inline edits currently in the DOM to the model.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  save: function() {

    if (!this.model.get('duplicating')) {
      var edits = {};
      this._inlineElementVisitor(function($el, contextString, selector) {
        edits[contextString] = this._adapter.getInlineEdit(this, contextString, selector);
      });
      this.model.set({edits: edits}, {silent: true});
    }

    return this;
  },

  /**
   * @inheritdoc
   */
  remove: function() {
    // We override the default remove function to prevent destruction of the
    // widget by default when the view is removed.
    return this;
  },

  /**
   * Gets the inline element selector for a given context id.
   *
   * @param {string} contextId
   *   The context id to get the selector for.
   *
   * @return {string}
   *   A jQuery selector for a given contextId.
   */
  _inlineElementSelector: function(contextId) {
    return '[' + this.inlineContextAttribute + '="' + contextId + '"]';
  },

  /**
   * A visitor function for processing inline editable elements.
   *
   * @param {function} callback
   *   A callback that will be invoked for each inline element in the DOM,
   *   with three arguments:
   *    - $el {jQuery} The inline element.
   *    - contextId: The context id associated with the inline element.
   *    - selector: A selector for locating the element in the DOM.
   * @param {jQuery} $rootEl
   *   The root element to search for inline editables inside. If none is
   *   provided, the widget root element is used by default.
   *
   * @return {this}
   *   The this object for call-chaining.
   */
  _inlineElementVisitor: function(callback, $rootEl) {
    if (!$rootEl) {
      $rootEl = this.$el;
    }

    var view = this;
    this._find(this.inlineEditorSelector, $rootEl).each(function() {
      var contextString = $(this).attr(view.inlineContextAttribute);
      var selector = view._inlineElementSelector(contextString);
      callback.call(view, $(this), contextString, selector);
    });

    return this;
  },

  /**
   * A find wrapper for jQuery that searches only within the context of the
   * widget this view is associated with.
   *
   * @param {string} selector
   *   The selector to search with.
   * @param {jQuery} $rootEl
   *   The root element to search inside. If none is provided, the widget root
   *   element is used by default.
   *
   * @return {jQuery}
   *   A jQuery wrapper object containing any matching elements.
   */
  _find: function(selector, $rootEl) {
    var view = this;
    var $result = $([]);

    if (!$rootEl) {
      $rootEl = this.$el;
    }

    $rootEl.children().each(function() {
      var $child = $(this);
      if ($child.is(selector)) {
        $result = $result.add($child);
      }
      if (!$child.is(view.widgetSelector)) {
        $result = $result.add(view._find(selector, $child));
      }
    });

    return $result;
  },

});

},{"../unimplemented":38}],36:[function(require,module,exports){

'use strict';

module.exports = {

  name: 'default',

  servicePrototypes: {
    'Binder': require('./Binder'),
    'CommandEmitter': require('./Editor/Command/CommandEmitter'),
    'ContextCollection': require('./Collections/ContextCollection'),
    'ContextListener': require('./Context/ContextListener'),
    'ContextResolver': require('./Context/ContextResolver'),
    'EditBufferItemRefFactory': require('./EditBuffer/EditBufferItemRefFactory'),
    'EditBufferMediator': require('./EditBuffer/EditBufferMediator'),
    'EditorCollection': require('./Collections/EditorCollection'),
    'ElementFactory': require('./Element/ElementFactory'),
    'SchemaCollection': require('./Collections/SchemaCollection'),
    'SyncActionDispatcher': require('./SyncAction/SyncActionDispatcher'),
    'SyncActionResolver': require('./SyncAction/SyncActionResolver'),
    'WidgetFactory': require('./Editor/Widget/WidgetFactory'),
    'WidgetStore': require('./Editor/Widget/WidgetStore'),
    'WidgetViewFactory': require('./Editor/Widget/WidgetViewFactory'),
    'EditorView': require('./Views/EditorView'),
  },

  views: {
    'editor': {
      prototype: require('./Views/WidgetEditorView'),
      options: {
        template: require('./Templates/WidgetEditorViewTemplate'),
      }
    },
    'export': {
      prototype: require('./Views/WidgetMementoView'),
      options: {
        template: require('./Templates/WidgetMementoViewTemplate'),
      },
    },
  },

  plugins: {
    adapter: {},
    protocol: {},
  },

  elements: {
    'widget': {
      tag: 'div',
      attributes: {
        'data-uuid': '<uuid>',
        'data-context-hint': '<context>',
        'data-viewmode': '<viewmode>',
        'class': 'widget-binder-widget'
      },
      selector: '.widget-binder-widget[data-context-hint]',
    },
    'field': {
      tag: 'div',
      attributes: {
        'data-field-name': '<name>',
        'data-context': '<context>',
        'data-mutable': '<editable>',
        'class': 'widget-binder-field'
      },
      selector: '.widget-binder-field[data-mutable="true"]',
    },
    'widget-display': {
      tag: 'div',
      attributes: {
        'class': 'widget-binder-widget__display',
      }
    },
    'toolbar': {
      tag: 'ul',
      attributes: {
        'class': 'widget-binder-toolbox',
      }
    },
    'toolbar-item': {
      tag: 'li',
      attributes: {
        'class': 'widget-binder-toolbox__item',
      }
    },
    'widget-command': {
      tag: 'a',
      attributes: {
        'class': 'widget-binder-command',
        'data-command': '<command>',
        'href': '#',
      }
    }
  },

  data: {
    context: {},
    schema: {},
  }
};

},{"./Binder":4,"./Collections/ContextCollection":5,"./Collections/EditorCollection":7,"./Collections/SchemaCollection":8,"./Context/ContextListener":10,"./Context/ContextResolver":11,"./EditBuffer/EditBufferItemRefFactory":13,"./EditBuffer/EditBufferMediator":14,"./Editor/Command/CommandEmitter":15,"./Editor/Widget/WidgetFactory":16,"./Editor/Widget/WidgetStore":17,"./Editor/Widget/WidgetViewFactory":18,"./Element/ElementFactory":20,"./SyncAction/SyncActionDispatcher":28,"./SyncAction/SyncActionResolver":29,"./Templates/WidgetEditorViewTemplate":30,"./Templates/WidgetMementoViewTemplate":31,"./Views/EditorView":32,"./Views/WidgetEditorView":33,"./Views/WidgetMementoView":34}],37:[function(require,module,exports){
/**
 * @file
 * A package for managing server / client data binding for editor widgets. 
 */

'use strict';

var _ = window._             ,
  $ = window.jQuery    ;

/**
 * The widget-sync library application root object.
 *
 * @param {object} config
 *   A map of configuration. See the default configuration as a reference.
 *
 * @constructor
 */
module.exports = function(config) {
  if (!config) {
    config = {};
  }
  this._initialize(config);
};

_.extend(module.exports, {

  defaults: require('./config'),

  PluginInterface: {
    EditorAdapter: require('./Plugins/EditorAdapter'),
    SyncProtocol: require('./Plugins/SyncProtocol'),
  },

  /**
   * A convenience factory method to create the WidgetBinder application root.
   *
   * @param {object} config
   *   A map of configuration. See the default configuration as a reference.
   *
   * @return {WidgetBinder}
   *   The root WidgetBinder library object.
   */
  create: function(config) {
    return new module.exports(config);
  },

  /**
   * Creates a copy of the default configuration and returns it.
   *
   * Call this method to avoid accidently making changes to the default
   * configuration object.
   *
   * @return {object}
   *   A copy of the default configuration object.
   */
  config: function() {
    var defaults = module.exports.defaults;
    var config = {};
    config.servicePrototypes = {};
    _.defaults(config.servicePrototypes, defaults.servicePrototypes);
    config.views = {};
    _.each(defaults.views, function(def, name) {
      config.views[name] = { options: {} };
      _.defaults(config.views[name].options, def.options);
      _.defaults(config.views[name], def);
    });
    config.plugins = {};
    _.defaults(config.plugins, defaults.plugins);
    $.extend(true, config.elements, defaults.elements);
    config.data = {};
    _.defaults(config.data, defaults.data);
    _.defaults(config, defaults);
    return config;
  }
});

_.extend(module.exports.prototype, {

  /**
   * Gets the element factory.
   *
   * @return {ElementFactory}
   *   The element factory used to create element templates and instances.
   */
  getElementFactory: function() {
    return this._elementFactory;
  },

  /**
   * Gets the context collection.
   *
   * @return {ContextCollection}
   *   The collection of all contexts referenced in every bound editor.
   */
  getContexts: function() {
    return this._contextCollection;
  },

  /**
   * Gets the schema collection.
   *
   * @return {SchemaCollection}
   *   The collection of all schema nodes.
   */
  getSchema: function() {
    return this._schemaCollection;
  },

  /**
   * Gets the editor collection.
   *
   * @return {EditorCollection}
   *   The collection of all associated editors.
   */
  getEditors: function() {
    return this._editorCollection;
  },

  /**
   * Gets the sync action dispatcher.
   *
   * @return {SyncActionDispatcher}
   *   The dispatcher for dispatching editor commands.
   */
  getSyncActionDispatcher: function() {
    return this._syncActionDispatcher;
  },

  /**
   * Gets the sync action resolver.
   *
   * @return {SyncActionResolver}
   *   The resolver for resolving sync action commands.
   */
  getSyncActionResolver: function() {
    return this._syncActionResolver;
  },

  /**
   * Opens a widget binder for a given editor.
   *
   * To close the binder later, call binder.close().
   *
   * @see Binder
   *
   * @param {jQuery} $editorEl
   *   The root element for the editor. This must have the context id attached
   *   as an attribute according to the 'field' template '<context>' data key name.
   *   By default this is 'data-context'.
   *
   * @return {Binder}
   *   The opened widget binder for the editor.
   */
  open: function($editorEl) {
    $editorEl.addClass('widget-binder-open');

    var editorContext = this._createContextResolver().resolveTargetContext($editorEl);
    var editorContextId = editorContext ? editorContext.get('id') : null;
    var editorModel;
    if (editorContextId) {
      if (!this._editorCollection.get(editorContextId)) {
        var contextResolver = this._createContextResolver(editorContext);
        var commandEmitter = this._createService('CommandEmitter', this._syncActionDispatcher, contextResolver);
        var editBufferItemRefFactory = this._createService('EditBufferItemRefFactory', contextResolver, commandEmitter);

        // Setup a context listener for recieving buffer item arrival
        // notifications, and a context resolver for determining which
        // context(s) an element is associated with.
        var contextListener = this._createService('ContextListener');
        contextListener.addContext(editorContext);

        // Create factories for generating models and views.
        var adapter = this._globalSettings.plugins.adapter;
        if (typeof adapter.create == 'function') {
          adapter = adapter.create.apply(adapter, arguments);
        }

        // Create a view factory for generating widget views.
        var viewFactory = this._createService('WidgetViewFactory', this._elementFactory, adapter);
        for (var type in this._globalSettings.views) {
          viewFactory.register(type, this._globalSettings.views[type]);
        }

        var uuidAttribute = this._elementFactory.getTemplate('widget').getAttributeName('<uuid>');
        var widgetFactory = this._createService('WidgetFactory', contextResolver, editBufferItemRefFactory, uuidAttribute);

        // Create a table for storing widget instances and a tracker tracker for
        // maintaining the table based on the editor state.
        var widgetStore = this._createService('WidgetStore', adapter);

        // Create a mediator for controlling interactions between the widget
        // table and the edit buffer.
        var editBufferMediator = this._createService('EditBufferMediator', editBufferItemRefFactory, this._elementFactory, contextListener, adapter, contextResolver);

        // Create the editor model and return it to the caller.
        editorModel = new this._globalSettings.servicePrototypes.EditorCollection.prototype.model({
          id: editorContextId,
        }, {
          widgetFactory: widgetFactory,
          viewFactory: viewFactory,
          widgetStore: widgetStore,
          editBufferMediator: editBufferMediator,
          context: editorContext,
          contextResolver: contextResolver,
        });
        var editorView = this._createService('EditorView', {
          model: editorModel,
          el: $editorEl[0],
        }, {
          elementFactory: this._elementFactory,
        });
        this._editorCollection.set(editorModel);

        return this._createService('Binder', editorView);
      }
      else {
        throw new Error('Existing binder already open for this editor instance.');
      }
    }
  },

  /**
   * Handles the initialization of objects that live at the application root.
   *
   * @param {object} config
   *   The config object as passed to the constructor.
   *
   * @return {void}
   */
  _initialize: function(config) {
    this._globalSettings = _.defaults(config, module.exports.defaults);

    var protocol = this._globalSettings.plugins.protocol;
    if (typeof protocol.create == 'function') {
      protocol = protocol.create.apply(protocol, arguments);
    }

    // Create the action dispatcher / resolution services for handling syncing
    // data with the server.
    this._syncActionResolver = this._createService('SyncActionResolver');
    this._syncActionDispatcher = this._createService('SyncActionDispatcher', protocol, this._syncActionResolver);

    // Create the top level collections that are shared across editor instances.
    var editorCollection = this._createService('EditorCollection');
    var contextCollection = this._createService('ContextCollection');
    var schemaCollection = this._createService('SchemaCollection', [], {
      contextCollection: contextCollection,
      dispatcher: this._syncActionDispatcher,
    });
    this._editorCollection = editorCollection;
    this._contextCollection = contextCollection;
    this._schemaCollection = schemaCollection;

    // Set up the collections that the sync action resolver should watch for
    // updates to.
    this._syncActionResolver.addCollection('context', this._contextCollection);
    this._syncActionResolver.addCollection('schema', this._schemaCollection);
    this._syncActionResolver.addCollection('editBufferItem', function(attributes) {
      return contextCollection.get(attributes.contextId).editBuffer;
    });
    this._syncActionResolver.addCollection('widget', function(attributes) {
      var widgetStore = editorCollection.get(attributes.editorContextId).widgetStore;
      return {
        get: function(id) {
          return widgetStore.get(id).model;
        },
        add: function(attributes) {
          return widgetStore.add(attributes);
        }
      };
    });

    // Create an element factory to provide a generic way to create markup.
    this._elementFactory = this._createService('ElementFactory', this._globalSettings.elements);

    // Load any initial models.
    if (config.data) {
      this._syncActionResolver.resolve(config.data);
    }
  },

  /**
   * Helper function to create a context resolver for a given editor instance.
   *
   * @param {Context} editorContext
   *   The root context of the editor.
   *
   * @return {ContextResolver}
   *   A context resolver specific to the provided editor context.
   */
  _createContextResolver: function(editorContext) {
    var sourceContextAttribute = this._elementFactory.getTemplate('widget').getAttributeName('<context>');
    var targetContextAttribute = this._elementFactory.getTemplate('field').getAttributeName('<context>');
    return this._createService('ContextResolver', this._contextCollection, sourceContextAttribute, targetContextAttribute, editorContext);
  },

  /**
   * Creates a service based on the configured prototype.
   *
   * Service names are the same as class names. We only support services with up
   * to five arguments
   *
   * @param {string} name
   *   The name of the service to be created. This is the default class name.
   *
   * @return {object}
   *   The created service. Note that a new service will be created each time
   *   this method is called. No static caching is performed.
   */
  _createService: function(name) {
    // All arguments that follow the 'name' argument are injected as
    // dependencies into the created object.
    var args = [];
    for (var i = 1; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }

    // We explicitly call the constructor here instead of doing some fancy magic
    // with wrapper classes in order to insure that the created object is
    // actually an instanceof the prototype.
    var prototype = this._globalSettings.servicePrototypes[name];
    switch (args.length) {
      case 0:
        return new prototype();
      case 1:
        return new prototype(args[0]);
      case 2:
        return new prototype(args[0], args[1]);
      case 3:
        return new prototype(args[0], args[1], args[2]);
      case 4:
        return new prototype(args[0], args[1], args[2], args[3]);
      case 5:
        return new prototype(args[0], args[1], args[2], args[3], args[4]);
      default:
        throw new Error('Really, you need to inject more than five services? Consider factoring ' + name + ' into separate classes.');
    }
  }

});

},{"./Plugins/EditorAdapter":26,"./Plugins/SyncProtocol":27,"./config":36}],38:[function(require,module,exports){
'use strict';

/**
 * Marks a method as an interface stub.
 *
 * @return {void}
 */
module.exports = function() {
  throw new Error('Unimplemented method.');
};

},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9qcy9zcmMvQnVuZGxlU2VsZWN0b3IuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9qcy9zcmMvV2lkZ2V0QmluZGluZ1Byb3RvY29sLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3IvanMvc3JjL2Zha2VfY2RmOTMyZWYuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9CaW5kZXIuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Db2xsZWN0aW9ucy9Db250ZXh0Q29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbGxlY3Rpb25zL0VkaXRCdWZmZXJJdGVtQ29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbGxlY3Rpb25zL0VkaXRvckNvbGxlY3Rpb24uanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Db2xsZWN0aW9ucy9TY2hlbWFDb2xsZWN0aW9uLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvQ29sbGVjdGlvbnMvV2lkZ2V0Q29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbnRleHQvQ29udGV4dExpc3RlbmVyLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvQ29udGV4dC9Db250ZXh0UmVzb2x2ZXIuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FZGl0QnVmZmVyL0VkaXRCdWZmZXJJdGVtUmVmLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdEJ1ZmZlci9FZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FZGl0QnVmZmVyL0VkaXRCdWZmZXJNZWRpYXRvci5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VkaXRvci9Db21tYW5kL0NvbW1hbmRFbWl0dGVyLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdG9yL1dpZGdldC9XaWRnZXRGYWN0b3J5LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdG9yL1dpZGdldC9XaWRnZXRTdG9yZS5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VkaXRvci9XaWRnZXQvV2lkZ2V0Vmlld0ZhY3RvcnkuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FbGVtZW50L0VsZW1lbnQuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FbGVtZW50L0VsZW1lbnRGYWN0b3J5LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL0NvbnRleHRNb2RlbC5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL01vZGVscy9FZGl0QnVmZmVySXRlbU1vZGVsLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL0VkaXRvck1vZGVsLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL1NjaGVtYU1vZGVsLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL1dpZGdldE1vZGVsLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvUGx1Z2lucy9FZGl0b3JBZGFwdGVyLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvUGx1Z2lucy9TeW5jUHJvdG9jb2wuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9TeW5jQWN0aW9uL1N5bmNBY3Rpb25EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvU3luY0FjdGlvbi9TeW5jQWN0aW9uUmVzb2x2ZXIuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9UZW1wbGF0ZXMvV2lkZ2V0RWRpdG9yVmlld1RlbXBsYXRlLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvVGVtcGxhdGVzL1dpZGdldE1lbWVudG9WaWV3VGVtcGxhdGUuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9WaWV3cy9FZGl0b3JWaWV3LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvVmlld3MvV2lkZ2V0RWRpdG9yVmlldy5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL1ZpZXdzL1dpZGdldE1lbWVudG9WaWV3LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvVmlld3MvV2lkZ2V0Vmlldy5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL2NvbmZpZy5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL2luZGV4LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvdW5pbXBsZW1lbnRlZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIERydXBhbCBBUEkgaW50ZWdyYXRpb25zIGZvciBwYXJhZ3JhcGhzX2VkaXRvci5cbiAqL1xuXG52YXIgRHJ1cGFsID0gcmVxdWlyZSgnZHJ1cGFsJyksXG4gICQgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuRHJ1cGFsLmJlaGF2aW9ycy5wYXJhZ3JhcGhzX2VkaXRvcl9idW5kbGVzZWxlY3RvciA9IHtcbiAgYXR0YWNoOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgJCgnLnBhcmFncmFwaHMtZWRpdG9yLWJ1bmRsZS1zZWxlY3Rvci1zZWFyY2gnLCBjb250ZXh0KS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRjb250YWluZXIgPSAkKHRoaXMpO1xuICAgICAgdmFyICRpbnB1dCA9ICRjb250YWluZXIuZmluZCgnLnBhcmFncmFwaHMtZWRpdG9yLWJ1bmRsZS1zZWxlY3Rvci1zZWFyY2hfX2lucHV0Jyk7XG4gICAgICB2YXIgJHN1Ym1pdCA9ICRjb250YWluZXIuZmluZCgnLnBhcmFncmFwaHMtZWRpdG9yLWJ1bmRsZS1zZWxlY3Rvci1zZWFyY2hfX3N1Ym1pdCcpO1xuXG4gICAgICAkaW5wdXQua2V5dXAoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAkc3VibWl0Lm1vdXNlZG93bigpO1xuICAgICAgfSkuYmx1cihmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykudHJpZ2dlcignZm9jdXMnKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG4iLCJ2YXIgRHJ1cGFsID0gcmVxdWlyZSgnZHJ1cGFsJyksXG4gICQgPSByZXF1aXJlKCdqcXVlcnknKSxcbiAgV2lkZ2V0QmluZGVyID0gcmVxdWlyZSgnd2lkZ2V0LWJpbmRlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdpZGdldEJpbmRlci5QbHVnaW5JbnRlcmZhY2UuU3luY1Byb3RvY29sLmV4dGVuZCh7XG5cbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKG1vZHVsZV9uYW1lKSB7XG4gICAgdGhpcy5tb2R1bGVOYW1lID0gbW9kdWxlX25hbWU7XG4gIH0sXG5cbiAgc2VuZDogZnVuY3Rpb24odHlwZSwgZGF0YSwgcmVzb2x2ZXIpIHtcbiAgICBpZiAodHlwZSA9PSAnRkVUQ0hfU0NIRU1BJykge1xuICAgICAgdGhpcy5fZ2V0KGRhdGEsIHJlc29sdmVyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9zZW5kQWpheENvbW1hbmQoZGF0YSwgcmVzb2x2ZXIpO1xuICAgIH1cbiAgfSxcblxuICBfc2VuZEFqYXhDb21tYW5kOiBmdW5jdGlvbihjb21tYW5kLCByZXNvbHZlcikge1xuXG4gICAgaWYgKCFjb21tYW5kLmNvbW1hbmQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHBhdGggPSAnL2FqYXgvcGFyYWdyYXBocy1lZGl0b3IvJyArIGNvbW1hbmQuY29tbWFuZDtcblxuICAgIGlmIChjb21tYW5kLnRhcmdldENvbnRleHQpIHtcbiAgICAgIHBhdGggKz0gJy8nICsgY29tbWFuZC50YXJnZXRDb250ZXh0O1xuICAgIH1cblxuICAgIGlmIChjb21tYW5kLnNvdXJjZUNvbnRleHQpIHtcbiAgICAgIHBhdGggKz0gJy8nICsgY29tbWFuZC5zb3VyY2VDb250ZXh0O1xuICAgIH1cblxuICAgIGlmIChjb21tYW5kLml0ZW1JZCkge1xuICAgICAgcGF0aCArPSAnLycgKyBjb21tYW5kLml0ZW1JZDtcbiAgICB9XG5cbiAgICBpZiAoY29tbWFuZC53aWRnZXQpIHtcbiAgICAgIHBhdGggKz0gJy8nICsgY29tbWFuZC53aWRnZXQ7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1hbmQudHlwZSkge1xuICAgICAgcGF0aCArPSAnLycgKyBjb21tYW5kLnR5cGU7XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBjb21tYW5kLnNldHRpbmdzKSB7XG4gICAgICBwYXJhbXMucHVzaCgnc2V0dGluZ3NbJyArIGtleSArICddPScgKyBjb21tYW5kLnNldHRpbmdzW2tleV0pO1xuICAgIH1cbiAgICBwYXJhbXMucHVzaCgnbW9kdWxlPScgKyB0aGlzLm1vZHVsZU5hbWUpO1xuICAgIHBhdGggKz0gJz8nICsgcGFyYW1zLmpvaW4oJyYnKTtcblxuICAgIHZhciBhamF4ID0gRHJ1cGFsLmFqYXgoe1xuICAgICAgdXJsOiBwYXRoLFxuICAgICAgcHJvZ3Jlc3M6IHtcbiAgICAgICAgbWVzc2FnZTogXCJcIixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBhamF4Lm9wdGlvbnMuZGF0YVsnZWRpdG9yQ29udGV4dCddID0gY29tbWFuZC5lZGl0b3JDb250ZXh0LmlkO1xuXG4gICAgaWYgKGNvbW1hbmQuZWRpdGFibGVDb250ZXh0cykge1xuICAgICAgXy5lYWNoKGNvbW1hbmQuZWRpdGFibGVDb250ZXh0cywgZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgICB2YXIga2V5ID0gJ2VkaXRhYmxlQ29udGV4dHMnO1xuICAgICAgICBrZXkgKz0gJ1snICsgY29udGV4dC5vd25lcklkICsgJ10nO1xuICAgICAgICBrZXkgKz0gJ1snICsgY29udGV4dC5maWVsZElkICsgJ10nO1xuICAgICAgICBhamF4Lm9wdGlvbnMuZGF0YVtrZXldID0gY29udGV4dC5pZDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBjb21wbGV0ZSA9IGFqYXgub3B0aW9ucy5jb21wbGV0ZTtcblxuICAgIGFqYXgub3B0aW9ucy5jb21wbGV0ZSA9IGZ1bmN0aW9uICh4bWxodHRwcmVxdWVzdCwgc3RhdHVzKSB7XG4gICAgICBjb21wbGV0ZS5jYWxsKGFqYXgub3B0aW9ucywgeG1saHR0cHJlcXVlc3QsIHN0YXR1cyk7XG4gICAgICBEcnVwYWwuYWpheC5pbnN0YW5jZXMuc3BsaWNlKGFqYXguaW5zdGFuY2VJbmRleCwgMSk7XG4gICAgfVxuXG4gICAgYWpheC5leGVjdXRlKCk7XG4gIH0sXG5cbiAgX2dldDogZnVuY3Rpb24oaWQsIHJlc29sdmVyKSB7XG4gICAgJC5nZXQoJy9hamF4L3BhcmFncmFwaHMtZWRpdG9yL3NjaGVtYS8nICsgaWQsICcnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmVzb2x2ZXIucmVzb2x2ZShyZXNwb25zZSk7XG4gICAgfSk7XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgRHJ1cGFsIEFQSSBpbnRlZ3JhdGlvbnMgZm9yIHBhcmFncmFwaHNfZWRpdG9yLlxuICovXG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBEcnVwYWwgPSByZXF1aXJlKCdkcnVwYWwnKSxcbiAgZHJ1cGFsU2V0dGluZ3MgPSByZXF1aXJlKCdkcnVwYWwtc2V0dGluZ3MnKSxcbiAgJCA9IHJlcXVpcmUoJ2pxdWVyeScpLFxuICBXaWRnZXRCaW5kaW5nUHJvdG9jb2wgPSByZXF1aXJlKCcuL1dpZGdldEJpbmRpbmdQcm90b2NvbCcpO1xuICBXaWRnZXRCaW5kZXIgPSByZXF1aXJlKCd3aWRnZXQtYmluZGVyJyk7XG5cbnJlcXVpcmUoJy4vQnVuZGxlU2VsZWN0b3InKTtcblxuLyoqXG4gKiB7QG5hbWVzcGFjZX1cbiAqL1xuRHJ1cGFsLnBhcmFncmFwaHNfZWRpdG9yID0ge307XG5cbi8qKlxuICogQ29tbWFuZCB0byBwcm9jZXNzIHJlc3BvbnNlIGRhdGEgZnJvbSBwYXJhZ3JhcGhzIGVkaXRvciBjb21tYW5kcy5cbiAqXG4gKiBAcGFyYW0ge0RydXBhbC5BamF4fSBbYWpheF1cbiAqICAge0BsaW5rIERydXBhbC5BamF4fSBvYmplY3QgY3JlYXRlZCBieSB7QGxpbmsgRHJ1cGFsLmFqYXh9LlxuICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlXG4gKiAgIFRoZSByZXNwb25zZSBmcm9tIHRoZSBBamF4IHJlcXVlc3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2UuaWRcbiAqICAgVGhlIG1vZGVsIGlkIGZvciB0aGUgY29tbWFuZCB0aGF0IHdhcyB1c2VkLlxuICovXG5EcnVwYWwuQWpheENvbW1hbmRzLnByb3RvdHlwZS5wYXJhZ3JhcGhzX2VkaXRvcl9kYXRhID0gZnVuY3Rpb24oYWpheCwgcmVzcG9uc2UsIHN0YXR1cyl7XG4gIHZhciBtb2R1bGVfbmFtZSA9IHJlc3BvbnNlLm1vZHVsZTtcbiAgZGVsZXRlIHJlc3BvbnNlLm1vZHVsZTtcbiAgRHJ1cGFsLnBhcmFncmFwaHNfZWRpdG9yLmluc3RhbmNlc1ttb2R1bGVfbmFtZV0uZ2V0U3luY0FjdGlvblJlc29sdmVyKCkucmVzb2x2ZShyZXNwb25zZSk7XG59XG5cbi8qKlxuICogVGhlbWUgZnVuY3Rpb24gZm9yIGdlbmVyYXRpbmcgcGFyYWdyYXBocyBlZGl0b3Igd2lkZ2V0cy5cbiAqXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKiAgIEEgc3RyaW5nIHJlcHJlc2VudGluZyBhIERPTSBmcmFnbWVudC5cbiAqL1xuRHJ1cGFsLnRoZW1lLnBhcmFncmFwaHNFZGl0b3JXaWRnZXQgPSBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgbWFya3VwLCBhY3Rpb25zKSB7XG4gIF8uZWFjaChhY3Rpb25zLCBmdW5jdGlvbihkZWYsIGlkKSB7XG4gICAgZGVmLnRpdGxlID0gRHJ1cGFsLnQoZGVmLnRpdGxlKTtcbiAgfSk7XG4gIHJldHVybiBXaWRnZXRCaW5kZXIuZGVmYXVsdHMudmlld3NbJ2VkaXRvciddLm9wdGlvbnMudGVtcGxhdGUoZWxlbWVudEZhY3RvcnksIG1hcmt1cCwgYWN0aW9ucyk7XG59XG5cbi8qKlxuICogVGhlbWUgZnVuY3Rpb24gZm9yIGdlbmVyYXRpbmcgcGFyYWdyYXBocyBlZGl0b3Igd2lkZ2V0cy5cbiAqXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKiAgIEEgc3RyaW5nIHJlcHJlc2VudGluZyBhIERPTSBmcmFnbWVudC5cbiAqL1xuRHJ1cGFsLnRoZW1lLnBhcmFncmFwaHNFZGl0b3JFeHBvcnQgPSBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgZmllbGRzLCBlZGl0cykge1xuICByZXR1cm4gV2lkZ2V0QmluZGVyLmRlZmF1bHRzLnZpZXdzWydleHBvcnQnXS5vcHRpb25zLnRlbXBsYXRlKGVsZW1lbnRGYWN0b3J5LCBmaWVsZHMsIGVkaXRzKTtcbn1cblxuRHJ1cGFsLnBhcmFncmFwaHNfZWRpdG9yLmluc3RhbmNlcyA9IHt9O1xuXG5EcnVwYWwucGFyYWdyYXBoc19lZGl0b3IucmVnaXN0ZXIgPSBmdW5jdGlvbihtb2R1bGVfbmFtZSwgYWRhcHRlcikge1xuICB2YXIgY29uZmlnID0gV2lkZ2V0QmluZGVyLmNvbmZpZygpO1xuXG4gIGNvbmZpZy5wbHVnaW5zID0ge1xuICAgIGFkYXB0ZXI6IGFkYXB0ZXIsXG4gICAgcHJvdG9jb2w6IG5ldyBXaWRnZXRCaW5kaW5nUHJvdG9jb2wobW9kdWxlX25hbWUpLFxuICB9O1xuXG4gIGNvbmZpZy5lbGVtZW50cy53aWRnZXQgPSB7XG4gICAgdGFnOiAncGFyYWdyYXBoJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAnZGF0YS11dWlkJzogJzx1dWlkPicsXG4gICAgICAnZGF0YS1jb250ZXh0LWhpbnQnOiAnPGNvbnRleHQ+JyxcbiAgICAgICdkYXRhLXZpZXdtb2RlJzogJzx2aWV3bW9kZT4nLFxuICAgIH0sXG4gICAgc2VsZWN0b3I6ICdwYXJhZ3JhcGhbZGF0YS1jb250ZXh0LWhpbnRdJ1xuICB9O1xuXG4gIGNvbmZpZy5lbGVtZW50cy5maWVsZCA9IHtcbiAgICB0YWc6ICdwYXJhZ3JhcGgtZmllbGQnLFxuICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICdkYXRhLWZpZWxkLW5hbWUnOiAnPG5hbWU+JyxcbiAgICAgICdkYXRhLWNvbnRleHQnOiAnPGNvbnRleHQ+JyxcbiAgICAgICdkYXRhLW11dGFibGUnOiAnPGVkaXRhYmxlPicsXG4gICAgfSxcbiAgICBzZWxlY3RvcjogJ3BhcmFncmFwaC1maWVsZFtkYXRhLW11dGFibGU9XCJ0cnVlXCJdLC5lZGl0YWJsZS1wYXJhZ3JhcGgtZmllbGQnLFxuICB9O1xuXG4gIGNvbmZpZy52aWV3c1snZWRpdG9yJ10ub3B0aW9ucy50ZW1wbGF0ZSA9IERydXBhbC50aGVtZS5wYXJhZ3JhcGhzRWRpdG9yV2lkZ2V0O1xuICBjb25maWcudmlld3NbJ2V4cG9ydCddLm9wdGlvbnMudGVtcGxhdGUgPSBEcnVwYWwudGhlbWUucGFyYWdyYXBoc0VkaXRvckV4cG9ydDtcblxuICBjb25maWcuZGF0YSA9IGRydXBhbFNldHRpbmdzLnBhcmFncmFwaHNfZWRpdG9yO1xuXG4gIHJldHVybiB0aGlzLmluc3RhbmNlc1ttb2R1bGVfbmFtZV0gPSBuZXcgV2lkZ2V0QmluZGVyKGNvbmZpZyk7XG59XG5cbkRydXBhbC5wYXJhZ3JhcGhzX2VkaXRvci5XaWRnZXRCaW5kZXIgPSBXaWRnZXRCaW5kZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIFdpZGdldE1vZGVsID0gcmVxdWlyZSgnLi9Nb2RlbHMvV2lkZ2V0TW9kZWwnKTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgYmluZGVyIGluc3RhbmNlLlxuICpcbiAqIEVhY2ggYmluZGVyIGluc3RhbmNlIHNob3VsZCBiZSBhc3NvY2lhdGVkIHdpdGggZXhhY3RseSBvbmUgZWRpdG9yIGluc3RhbmNlLlxuICpcbiAqIFRoaXMgb2JqZWN0IHNob3VsZCBub3QgYmUgY3JlYXRlZCBkaXJlY3RseS4gVG8gY3JlYXRlIGJpbmRlcnM6XG4gKlxuICogQGNvZGVcbiAqIHJlcXVpcmUoJ3dpZGdldC1iaW5kZXInKS5vcGVuKCRlZGl0b3JFbGVtZW50KTtcbiAqIEBlbmRjb2RlXG4gKlxuICogVGhlIGJpbmRlciBjb3VwbGVzIGFsbCB0aGUgb2JqZWN0cyBuZWVkZWQgdG8gdHJhY2sgd2lkZ2V0IGRhdGEgYW5kIHBlcmZvcm1cbiAqIGRvd25zdHJlYW0gc3luY2hyb25pemF0aW9uIGZyb20gdGhlIHNlcnZlci5cbiAqXG4gKiBXaWRnZXQgTGlmZWN5Y2xlOlxuICpcbiAqICAgQ3JlYXRlOlxuICogICAgIFdoZW4gYSB3aWRnZXQgaXMgY3JlYXRlZCBpdCBzaG91bGQgY2FsbCB0aGUgJ2JpbmQnIG1ldGhvZCBvbiB0aGUgYmluZGVyXG4gKiAgICAgdG8gaW5zdHJ1Y3QgdGhlIGJpbmRlciB0byBzdGFydCB0cmFja2luZyB0aGUgd2lkZ2V0LiBUaGlzIGJpbmRzIHRoZVxuICogICAgIGVkaXRvciB3aWRnZXQgdG8gYSBzZXJ2ZXIgc2lkZSBkYXRhIG1vZGVsIGFuZCByZW5kZXJzIHRoZSB3aWRnZXQgdXNpbmdcbiAqICAgICB0aGF0IG1vZGVsLiBJdCBhbHNvIGF0dGFjaGVzIGFjdGlvbnMgdG8gdGhlIHdpZGdldCB0aGF0IHVzZXJzIG1heVxuICogICAgIHBlcmZvcm0sIGFuZCBzZXRzIHVwIGlubGluZSBlZGl0aW5nLlxuICpcbiAqICAgRWRpdDpcbiAqICAgICBXaGVuIGFuIGVkaXQgYWN0aW9uIGlzIHJlcXVlc3RlZCwgdGhlIHN5bmMgcHJvdG9jb2wgcmVxdWVzdHMgdGhhdCB0aGVcbiAqICAgICBzZXJ2ZXIgYWxsb3cgdGhlIHVzZXIgdG8gZWRpdCB3aWRnZXQncyBhc3NvY2lhdGVkIGRhdGEgZW50aXR5IG1vZGVsLiBJZlxuICogICAgIHRoZSBtYXJrdXAgY2hhbmdlcywgdGhlIHdpZGdldCBpcyByZS1yZW5kZXJlZCBhbmQgZXhpc3RpbmcgaW5saW5lIGVkaXRzXG4gKiAgICAgYXJlIHByZXNlcnZlZC5cbiAqXG4gKiAgIER1cGxpY2F0ZTpcbiAqICAgICBTaW5jZSBlYWNoIHdpZGdldCBpcyBib3VuZCB0byBhIHVuaXF1ZSBkYXRhIGVudGl0eSBvbiB0aGUgc2VydmVyLFxuICogICAgIG9wZXJhdGlvbnMgbGlrZSBjb3B5IGFuZCBwYXN0ZSwgb3IgbW92aW5nIGEgd2lkZ2V0IHRvIGEgZGlmZmVyZW50IHBhcnRcbiAqICAgICBvZiB0aGUgZG9jdW1lbnQgbWF5IHJlc3VsdCBpbiB0aGUgd2lkZ2V0J3MgYXNzb2NpYXRlZCBkYXRhIGVudGl0eSBiZWluZ1xuICogICAgIGR1cGxpY2F0ZWQgb24gdGhlIHNlcnZlci4gSWYgdGhpcyBvY2N1cnMsIHRoZSB3aWRnZXQgd2lsbCBiZSByZS1yZW5kZXJlZFxuICogICAgIHdpdGggaXRzIG5ldyByZWZlcmVuY2VzLCBhZ2FpbiBwcmVzZXJ2aW5nIGlubGluZSBlZGl0cy5cbiAqXG4gKiAgIEV4cG9ydDpcbiAqICAgICBXaGVuIHRoZSBjb250ZW50IGF1dGhvciBpcyBmaW5pc2hlZCBlZGl0aW5nLCB0aGUgZWRpdG9yIHBlcmZvcm0gY2xlYW51cFxuICogICAgIG9uIHRoZSBtYXJrdXAuIEFzIGEgcGFydCBvZiB0aGlzIFwiY2xlYW51cFwiLCB0aGUgY2xpZW50IGNhbGxzIHRoZSAnc2F2ZSdcbiAqICAgICBtZXRob2QgdG8gZ2VuZXJhdGUgdGhlIFwiZXhwb3J0IG1hcmt1cFwiLCB3aGljaCBpcyB3aGF0IHdpbGwgZ2V0IHNlbnQgdG9cbiAqICAgICB0aGUgc2VydmVyLlxuICpcbiAqICAgRGVzdHJveTpcbiAqICAgICBXaGVuIGEgd2lkZ2V0IGlzIGRlc3Ryb3llZCBpbiB0aGUgZWRpdG9yLCB0aGUgY2xpZW50IGNhbGxzIHRoZSAnZGVzdHJveSdcbiAqICAgICBtZXRob2QgdG8gdW5iaW5kIGFuZCBmcmVlIGFsbCByZWZlcmVuY2VzIHRvIHRoZSB3aWRnZXQuXG4gKlxuICogQHBhcmFtIHtCYWNrYm9uZS5WaWV3fSBlZGl0b3JWaWV3XG4gKiAgIFRoZSB2aWV3IHRoYXQgd2lsbCBiZSB1c2VkIHRvIGtlZXAgdGhlIGVkaXRvciByb290IGVsZW1lbnQgaW4gc3luYy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlZGl0b3JWaWV3KSB7XG4gIHRoaXMuX2VkaXRvclZpZXcgPSBlZGl0b3JWaWV3O1xuICB0aGlzLl93aWRnZXRGYWN0b3J5ID0gZWRpdG9yVmlldy5tb2RlbC53aWRnZXRGYWN0b3J5O1xuICB0aGlzLl92aWV3RmFjdG9yeSA9IGVkaXRvclZpZXcubW9kZWwudmlld0ZhY3Rvcnk7XG4gIHRoaXMuX3dpZGdldFN0b3JlID0gZWRpdG9yVmlldy5tb2RlbC53aWRnZXRTdG9yZTtcbiAgdGhpcy5fZWRpdEJ1ZmZlck1lZGlhdG9yID0gZWRpdG9yVmlldy5tb2RlbC5lZGl0QnVmZmVyTWVkaWF0b3I7XG4gIHRoaXMuX2NvbnRleHRSZXNvbHZlciA9IGVkaXRvclZpZXcubW9kZWwuY29udGV4dFJlc29sdmVyO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCBCYWNrYm9uZS5FdmVudHMsIHtcblxuICAvKipcbiAgICogUmVxdWVzdHMgdGhhdCBhIG5ldyB3aWRnZXQgYmUgaW5zZXJ0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0RWxcbiAgICogICBUaGUgZWxlbWVudCB0aGF0IHRoZSBuZXcgd2lkZ2V0IHdpbGwgYmUgaW5zZXJ0ZWQgaW50by5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogICBUaGUgdHlwZSBvZiB0aGUgaXRlbSB0byByZXF1ZXN0LiBUaGlzIHBhcmFtZXRlciBpcyBvcHRpb25hbC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24oJHRhcmdldEVsLCB0eXBlKSB7XG4gICAgdGhpcy5fZWRpdEJ1ZmZlck1lZGlhdG9yLnJlcXVlc3RCdWZmZXJJdGVtKHR5cGUsICR0YXJnZXRFbCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE1ha2VzIHdpZGdldCBtYW5hZ2VyIGF3YXJlIG9mIGEgbmV3bHkgaW5zZXJ0ZWQgd2lkZ2V0LlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBtb3N0IGltcG9ydGFudCBtZXRob2QgaGVyZS4gSXQgaXMgY2FsbGVkIHdoZW4gYSBuZXcgd2lkZ2V0IGlzXG4gICAqIGNyZWF0ZWQgaW4gdGhlIGVkaXRvciBpbiBvcmRlciB0byBpbnN0cnVjdCB0aGUgbWFuYWdlciB0byBzdGFydCB0cmFja2luZ1xuICAgKiB0aGUgbGlmZWN5Y2xlIG9mIHRoZSB3aWRnZXQsIGl0cyBkb20gcmVwcmVzZW50YXRpb24sIGFuZCB0aGUgZWRpdCBidWZmZXJcbiAgICogZGF0YSBpdGVtIGl0IHJlZmVyZW5jZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IHdpZGdldFxuICAgKiAgIFRoZSBlZGl0b3IgcmVwcmVzZW50YXRpb24gb2YgYSB3aWRnZXQuIFRoaXMgY2FuIGJlIGFueSBkYXRhIHlvdSB3YW50IHRvXG4gICAqICAgYXNzb2NpYXRlIHdpdGggdGhlIHdpZGdldCwgYnV0IHdpbGwgdXN1YWxseSBiZSBhbiBvYmplY3QgZ2VuZXJhdGVkIGJ5IHRoZVxuICAgKiAgIGVkaXRvci4gVGhpcyB3aWxsIGJlIGF2YWlsYWJsZSB0byB0aGUgZWRpdG9yIGFkYXB0ZXIgZHVyaW5nIHdpZGdldFxuICAgKiAgIG9wZXJhdGlvbnMuXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGlkXG4gICAqICAgQSB1bmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIHdpZGdldC4gVGhpcyB3aWxsIHVzdWFsbHkgYmUgZ2VuZXJhdGVkIGJ5IHRoZVxuICAgKiAgIGVkaXRvci5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXRFbFxuICAgKiAgIFRoZSByb290IGVsZW1lbnQgb2YgdGhlIHdpZGdldCB3aXRoaW4gdGhlIGVkaXRvci5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgVGhlIGJvdW5kIG1vZGVsLlxuICAgKi9cbiAgYmluZDogZnVuY3Rpb24od2lkZ2V0LCBpZCwgJHRhcmdldEVsKSB7XG4gICAgLy8gQ3JlYXRlIGEgbW9kZWwgZm9yIHJlcHJlc2VudGluZyB0aGUgd2lkZ2V0LlxuICAgIHZhciB3aWRnZXRNb2RlbCA9IHRoaXMuX3dpZGdldEZhY3RvcnkuY3JlYXRlKHdpZGdldCwgaWQsICR0YXJnZXRFbCk7XG4gICAgdmFyIHRhcmdldENvbnRleHQgPSB3aWRnZXRNb2RlbC5lZGl0QnVmZmVySXRlbVJlZi50YXJnZXRDb250ZXh0O1xuICAgIHZhciBzb3VyY2VDb250ZXh0ID0gd2lkZ2V0TW9kZWwuZWRpdEJ1ZmZlckl0ZW1SZWYuc291cmNlQ29udGV4dDtcblxuICAgIC8vIENyZWF0ZSBhIHdpZGdldCB2aWV3IHRvIHJlbmRlciB0aGUgd2lkZ2V0IHdpdGhpbiBFZGl0b3IuXG4gICAgdmFyIHdpZGdldEVkaXRvclZpZXcgPSB0aGlzLl92aWV3RmFjdG9yeS5jcmVhdGUod2lkZ2V0TW9kZWwsICR0YXJnZXRFbCwgJ2VkaXRvcicpO1xuXG4gICAgLy8gQWRkIHRoZSB3aWRnZXQgdG8gdGhlIHdpZGdldCB0byB0aGUgdGFibGUgdG8ga2VlcCB0cmFjayBvZiBpdC5cbiAgICB0aGlzLl93aWRnZXRTdG9yZS5hZGQod2lkZ2V0TW9kZWwsIHdpZGdldEVkaXRvclZpZXcpO1xuXG4gICAgLy8gQXR0YWNoIGV2ZW50IGhhbmRsaW5nLlxuICAgIHRoaXMudHJpZ2dlcignYmluZCcsIHRoaXMsIHdpZGdldE1vZGVsLCB3aWRnZXRFZGl0b3JWaWV3KTtcblxuICAgIHRoaXMubGlzdGVuVG8od2lkZ2V0TW9kZWwsICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh3aWRnZXRNb2RlbC5oYXNTdGF0ZShXaWRnZXRNb2RlbC5TdGF0ZS5ERVNUUk9ZRURfUkVGUykpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCd1bmJpbmQnLCB0aGlzLCB3aWRnZXRNb2RlbCwgd2lkZ2V0RWRpdG9yVmlldyk7XG4gICAgICAgIHRoaXMuc3RvcExpc3RlbmluZyh3aWRnZXRNb2RlbCk7XG4gICAgICB9XG4gICAgICBpZiAod2lkZ2V0TW9kZWwuaGFzU3RhdGUoV2lkZ2V0TW9kZWwuU3RhdGUuREVTVFJPWUVEX1dJREdFVCkpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdkZXN0cm95JywgdGhpcywgd2lkZ2V0TW9kZWwsIHdpZGdldEVkaXRvclZpZXcpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5saXN0ZW5Ubyh3aWRnZXRNb2RlbCwgJ3NhdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHJpZ2dlcignc2F2ZScsIHRoaXMsIHdpZGdldE1vZGVsLCB3aWRnZXRFZGl0b3JWaWV3KTtcbiAgICB9LCB0aGlzKTtcblxuICAgIC8vIElmIHRoZSB3aWRnZXQgaXMgbm90IGN1cnJlbnRseSB1c2luZyB0aGUgZWRpdG9yIHZpZXcgbW9kZSwgd2UgdHJlYXRcbiAgICAvLyBpdCBhcyBiZWluZyBpbiAnZXhwb3J0JyBmb3JtLiBUaGlzIG1lYW5zIHdlIGhhdmUgdG8gY3JlYXRlIGFuIGV4cG9ydFxuICAgIC8vIHZpZXcgdG8gbG9hZCB0aGUgZGF0YS5cbiAgICBpZiAoIXdpZGdldEVkaXRvclZpZXcuaXNFZGl0b3JWaWV3UmVuZGVyZWQoKSkge1xuICAgICAgdGhpcy5fdmlld0ZhY3RvcnkuY3JlYXRlVGVtcG9yYXJ5KHdpZGdldE1vZGVsLCAkdGFyZ2V0RWwsICdleHBvcnQnKS5zYXZlKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgd2lkZ2V0RWRpdG9yVmlldy5zYXZlKCk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgaXMgbW9yZSB0aGFuIG9uZSB3aWRnZXQgcmVmZXJlbmNpbmcgdGhlIHNhbWUgYnVmZmVyIGl0ZW0gd2VcbiAgICAvLyBuZWVkIHRvIGR1cGxpY2F0ZSBpdC4gT25seSBvbmUgd2lkZ2V0IGNhbiBldmVyIHJlZmVyZW5jZSBhIGdpdmVuXG4gICAgLy8gYnVmZmVyIGl0ZW0uIEFkZGl0aW9uYWxseSwgaWYgdGhlIHNvdXJjZSBjb250ZXh0IGlzIG5vdCB0aGUgc2FtZSBhcyB0aGVcbiAgICAvLyB0YXJnZXQgY29udGV4dCB3ZSBuZWVkIHRvIGR1cGxpY2F0ZS4gQSBjb250ZXh0IG1pc21hdGNoIGVzc2VudGlhbGx5XG4gICAgLy8gbWVhbnMgc29tZXRoaW5nIHdhcyBjb3BpZWQgZnJvbSBhbm90aGVyIGZpZWxkIGluc3RhbmNlIGludG8gdGhpcyBmaWVsZFxuICAgIC8vIGluc3RhbmNlLCBzbyBhbGwgdGhlIGRhdGEgYWJvdXQgaXQgaXMgaW4gdGhlIG9yaWdpbmFsIGZpZWxkIGluc3RhbmNlLlxuICAgIHZhciBtYXRjaGluZ0NvbnRleHRzID0gc291cmNlQ29udGV4dC5nZXQoJ2lkJykgPT09IHRhcmdldENvbnRleHQuZ2V0KCdpZCcpO1xuICAgIGlmICh0aGlzLl93aWRnZXRTdG9yZS5jb3VudCh3aWRnZXRNb2RlbCkgPiAxIHx8ICFtYXRjaGluZ0NvbnRleHRzKSB7XG4gICAgICB3aWRnZXRNb2RlbC5kdXBsaWNhdGUoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB3aWRnZXRFZGl0b3JWaWV3LnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJldHVybiB3aWRnZXRNb2RlbDtcbiAgfSxcblxuICAvKipcbiAgICogVW5iaW5kcyAoc3RvcHMgdHJha2NpbmcpIGEgd2lkZ2V0IHdpdGhvdXQgZGVzdHJveWluZyB0aGUgd2lkZ2V0IGl0c2VsZi5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgaWQgb2YgdGhlIHdpZGdldCB0byBiZSB1bmJvdW5kLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRNb2RlbH1cbiAgICogICBUaGUgc2F2ZWQgbW9kZWwgb3IgdW5kZWZpbmVkIGlmIG5vIHN1Y2ggbW9kZWwgd2FzIGZvdW5kLlxuICAgKi9cbiAgdW5iaW5kOiBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiB0aGlzLl9hcHBseVRvTW9kZWwoaWQsIGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgICB0aGlzLl93aWRnZXRTdG9yZS5yZW1vdmUod2lkZ2V0TW9kZWwsIHRydWUpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIGFuIGV4aXN0aW5nIHdpZGdldC5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgd2lkZ2V0IGlkIHRvIGxvb2t1cC5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgQSB3aWRnZXQgbW9kZWwgaWYgdGhlIGlkIGV4aXN0ZWQgaW4gdGhlIHN0b3JlLCBvciB1bmRlZmluZWQgb3RoZXJ3aXNlLlxuICAgKi9cbiAgZ2V0OiBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiB0aGlzLl93aWRnZXRTdG9yZS5nZXQoaWQsIHRydWUpLm1vZGVsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXF1ZXN0cyBhbiBlZGl0IG9wZXJhdGlvbiBmb3IgYSB3aWRnZXQncyByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0uXG4gICAqXG4gICAqIFRoaXMgdHJpZ2dlcnMgYW4gJ2VkaXQnIGNvbW1hbmQgZm9yIHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0uIEl0J3NcbiAgICogdXAgdG8gdGhlIHN5bmMgcHJvdGNvbCBwbHVnaW4sIGFuZCBhc3NvY2lhdGVkIGxvZ2ljIHRvIGRldGVybWluZSBob3cgdG9cbiAgICogaGFuZGxlIHRoaXMgY29tbWFuZC5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgaWQgb2YgdGhlIG1vZGVsIHRvIGdlbmVyYXRlIGFuIGVkaXQgcmVxdWVzdCBmb3IuXG4gICAqXG4gICAqIEByZXR1cm4ge1dpZGdldE1vZGVsfVxuICAgKiAgIFRoZSBzYXZlZCBtb2RlbCBvciB1bmRlZmluZWQgaWYgbm8gc3VjaCBtb2RlbCB3YXMgZm91bmQuXG4gICAqL1xuICBlZGl0OiBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiB0aGlzLl9hcHBseVRvTW9kZWwoaWQsIGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgICB3aWRnZXRNb2RlbC5lZGl0KCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNhdmVzIGFueSBpbmxpbmUgZWRpdHMgdG8gdGhlIHdpZGdldC5cbiAgICpcbiAgICogTm90ZSB0aGF0IHRoaXMgZG9lcyBub3QgdHJpZ2dlciBhIHNlcnZlciBzeW5jLiBJdCBzaW1wbHkgdXBkYXRlcyB0aGUgd2lkZ2V0XG4gICAqIG1vZGVsIGJhc2VkIG9uIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBlZGl0b3Igdmlldy5cbiAgICpcbiAgICogVGhlIGVkaXRvciBpcyBpbiBjaGFyZ2Ugb2YgbWFuYWdpbmcgdGhlIGdlbmVyYXRlZCBtYXJrdXAgYW5kIHNlbmRpbmcgaXQgdG9cbiAgICogdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgaWQgb2YgdGhlIHdpZGdldCB0byBzYXZlIGlubGluZSBlZGl0cyBmb3IuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0RWxcbiAgICogICBUaGUgZWxlbWVudCB0byBzYXZlIHRoZSBvdXRwdXRlZCBkYXRhIGZvcm1hdCB0by5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgVGhlIHNhdmVkIG1vZGVsIG9yIHVuZGVmaW5lZCBpZiBubyBzdWNoIG1vZGVsIHdhcyBmb3VuZC5cbiAgICovXG4gIHNhdmU6IGZ1bmN0aW9uKGlkLCAkdGFyZ2V0RWwpIHtcbiAgICByZXR1cm4gdGhpcy5fYXBwbHlUb01vZGVsKGlkLCBmdW5jdGlvbih3aWRnZXRNb2RlbCkge1xuICAgICAgd2lkZ2V0TW9kZWwudHJpZ2dlcignc2F2ZScpO1xuICAgICAgdGhpcy5fdmlld0ZhY3RvcnkuY3JlYXRlVGVtcG9yYXJ5KHdpZGdldE1vZGVsLCAkdGFyZ2V0RWwsICdlZGl0b3InKS5zYXZlKCk7XG4gICAgICB0aGlzLl92aWV3RmFjdG9yeS5jcmVhdGVUZW1wb3Jhcnkod2lkZ2V0TW9kZWwsICR0YXJnZXRFbCwgJ2V4cG9ydCcpLnJlbmRlcigpLnNhdmUoKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRGVzdHJveXMgYSB3aWRnZXRzIHRyYWNraW5nIGRhdGEgYW5kIGluaXRpYXRlcyB3aWRnZXQgZGVzdHJ1Y3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdG8gYmUgZGVzdHJveWVkLlxuICAgKiBAcGFyYW0ge2Jvb2x9IHdpZGdldERlc3Ryb3llZFxuICAgKiAgIFNldCB0byB0cnVlIGlmIHRoZSB3aWRnZXQgaGFzIGFscmVhZHkgYmVlbiBkZXN0cm95ZWQgaW4gdGhlIGVkaXRvci5cbiAgICogICBTZXR0aW5nIHRoaXMgdG8gZmFsc2Ugd2lsbCByZXN1bHQgaW4gdGhlIGRlc3RydWN0aW9uIG9mIHRoZSB3aWRnZXQgd2l0aGluXG4gICAqICAgdGhlIGVkaXRvci5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgVGhlIGRlc3Ryb3llZCBtb2RlbC5cbiAgICovXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKGlkLCB3aWRnZXREZXN0cm95ZWQpIHtcbiAgICB0aGlzLl9hcHBseVRvTW9kZWwoaWQsIGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgICBpZiAod2lkZ2V0RGVzdHJveWVkKSB7XG4gICAgICAgIHdpZGdldE1vZGVsLnNldFN0YXRlKFdpZGdldE1vZGVsLlN0YXRlLkRFU1RST1lFRF9XSURHRVQpO1xuICAgICAgfVxuICAgICAgd2lkZ2V0TW9kZWwuZGVzdHJveSgpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDbGVhbnMgdXAgYWZ0ZXIgdGhlIHdpZGdldCBtYW5hZ2VyIG9iamVjdC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lZGl0b3JWaWV3Lm1vZGVsLmRlc3Ryb3koKTtcbiAgICB0aGlzLl9lZGl0b3JWaWV3LnN0b3BMaXN0ZW5pbmcoKTtcbiAgICB0aGlzLl93aWRnZXRTdG9yZS5jbGVhbnVwKCk7XG4gICAgdGhpcy5fZWRpdEJ1ZmZlck1lZGlhdG9yLmNsZWFudXAoKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgc2V0dGluZ3MgZm9yIHRoaXMgYmluZGVyIGluc3RhbmNlLlxuICAgKlxuICAgKiBUaGUgc2V0dGluZ3MgYXJlIGxpbmtlZCB0byB0aGUgcm9vdCAoZWRpdG9yKSBjb250ZXh0LlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqICAgVGhlIHNldHRpbmdzIG9iamVjdCBmb3IgdGhlIHJvb3QgY29udGV4dC5cbiAgICovXG4gIGdldFNldHRpbmdzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldEVkaXRvckNvbnRleHQoKS5nZXQoJ3NldHRpbmdzJyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHNldHRpbmdzIGZvciB0aGlzIGJpbmRlciBpbnN0YW5jZS5cbiAgICpcbiAgICogVGhlIHNldHRpbmdzIGFyZSBsaW5rZWQgdG8gdGhlIHJvb3QgKGVkaXRvcikgY29udGV4dC5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzXG4gICAqICAgVGhlIHNldHRpbmdzIG9iamVjdCB0byB3cml0ZS4gTm90ZSB0aGF0IHRoaXMgd2lsbCBvdmVyd3JpdGUgdGhlICplbnRpcmUqXG4gICAqICAgZXhpc3Rpbmcgc2V0dGluZ3Mgb2JqZWN0LlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgc2V0U2V0dGluZ3M6IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG4gICAgdGhpcy5fY29udGV4dFJlc29sdmVyLmdldEVkaXRvckNvbnRleHQoKS5zZXQoeyBzZXR0aW5nczogc2V0dGluZ3MgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgYW4gaW5kaXZpZHVhbCBzZXR0aW5nIGJ5IG5hbWUuXG4gICAqXG4gICAqIFRoZSBzZXR0aW5ncyBhcmUgbGlua2VkIHRvIHRoZSByb290IChlZGl0b3IpIGNvbnRleHQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqICAgVGhlIG5hbWUgb2YgdGhlIHNldHRpbmcgdG8gbG9va3VwLlxuICAgKlxuICAgKiBAcmV0dXJuIHttaXhlZH1cbiAgICogICBUaGUgc2V0dGluZyB2YWx1ZSBvciB1bmRlZmluZWQgaWYgbm8gdmFsdWUgd2FzIGZvdW5kLlxuICAgKi9cbiAgZ2V0U2V0dGluZzogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9jb250ZXh0UmVzb2x2ZXIuZ2V0RWRpdG9yQ29udGV4dCgpLmdldFNldHRpbmcobmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlc29sdmVzIHRoZSBjb250ZXh0IGZvciBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsXG4gICAqICAgVGhlIGVsZW1lbnQgdG8gcmVzb2x2ZSB0aGUgY29udGV4dCBvZi5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogICBUaGUgdHlwZSBvZiByZXNvbHV0aW9uIHRvIHBlcmZvcm0uIFRoZSBvcHRpb25zIGFyZTpcbiAgICogICAgLSAndGFyZ2V0JzogUmVzb2x2ZXMgdGhlIGNvbmV4dCBhdCB0aGUgZWxlbWVudHMgcG9zaXRpb24gaW4gdGhlIGVkaXRvci5cbiAgICogICAgICBUaGlzIGlzIHVzdWFsbHkgdGhlIGNvbnRleHQgeW91IGFyZSBsb29raW5nIGZvciwgYW5kIGlzIHRoZSBkZWZhdWx0XG4gICAqICAgICAgaWYgbm8gdHlwZSBpcyBleHBsaWNpdGx5IHByb3ZpZGVkLlxuICAgKiAgICAtICdzb3VyY2UnOiBSZXNvbHZlcyB0aGUgY29udGV4dCB0aGUgZWxlbWVudCBoYXMgYmVlbiB0YWdnZWQgd2l0aC5cbiAgICogICAgICBUaGUgc291cmNlIGNvbnRleHQgbWF5IGJlIGRpZmZlcmVudCB0aGFuIHRoZSB0YXJnZXQgY29udGV4dCBpZiwgZm9yXG4gICAqICAgICAgZXhhbXBsZSwgdGhlIHdpZGdldCB3YXMgcmVjZW50bHkgY29waWVkIGZyb20gb25lIGNvbnRleHQgYW5kIHBhc3RlZFxuICAgKiAgICAgIGludG8gYW5vdGhlci4gVGhlIHdpZGdldCBiaW5kZXIgYXV0b21hdGljYWxseSByZXNvbHZlcyB0aGVzZVxuICAgKiAgICAgIHNpdHVhdGlvbnMgaW4gdGhlIGJhY2tncm91bmQsIHNvIHRoZXJlIHNob3VsZCByYXJlbHkgYmUgYSBzaXR1YXRpb25cbiAgICogICAgICB3aGVyZSBjbGllbnQgY29kZSBuZWVkcyB0aGUgc291cmNlIGNvbnRleHQuXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLk1vZGVsfVxuICAgKiAgIFRoZSBjb250ZXh0IG1vZGVsIGFzc29jaWF0ZWQgd2l0aCB0aGUgZWxlbWVudC5cbiAgICovXG4gIHJlc29sdmVDb250ZXh0OiBmdW5jdGlvbigkZWwsIHR5cGUpIHtcbiAgICBpZiAoIXR5cGUpIHtcbiAgICAgIHR5cGUgPSAndGFyZ2V0JztcbiAgICB9XG4gICAgaWYgKHR5cGUgPT0gJ3RhcmdldCcpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0UmVzb2x2ZXIucmVzb2x2ZVRhcmdldENvbnRleHQoJGVsKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSA9PSAnc291cmNlJykge1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHRSZXNvbHZlci5yZXNvbHZlU291cmNlQ29udGV4dCgkZWwpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb250ZXh0IHR5cGUuJyk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBBIGNvbnZlbmllbmNlIGZ1bmN0aW9uIGZvciBsb29raW5nIHVwIGEgd2lkZ2V0IGFuZCBhcHBseWluZyBhbiBhY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdG8gYWN0IG9uLlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiAgIFRoZSBhY3Rpb24gdG8gYXBwbHkgdGhlIG1vZGVsLCBpZiBmb3VuZC5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgVGhlIG1vZGVsIGFjdGVkIG9uLCBpZiBhbiBhY3Rpb24gd2FzIGFwcGxpZWQuXG4gICAqL1xuICBfYXBwbHlUb01vZGVsOiBmdW5jdGlvbihpZCwgY2FsbGJhY2spIHtcbiAgICB2YXIgd2lkZ2V0TW9kZWwgPSB0aGlzLmdldChpZCk7XG4gICAgaWYgKHdpZGdldE1vZGVsKSB7XG4gICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBbd2lkZ2V0TW9kZWxdKTtcbiAgICAgIHJldHVybiB3aWRnZXRNb2RlbDtcbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSBjb2xsZWN0aW9uIG9mIHNjaGVtYSBtb2RlbHMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICBDb250ZXh0TW9kZWwgPSByZXF1aXJlKCcuLi9Nb2RlbHMvQ29udGV4dE1vZGVsJyk7XG5cbi8qKlxuICogQmFja2JvbmUgQ29sbGVjdGlvbiBmb3IgY29udGV4dCBtb2RlbHMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXG4gIG1vZGVsOiBDb250ZXh0TW9kZWwsXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBnZXQ6IGZ1bmN0aW9uKGNvbnRleHRJZCwgc2V0dGluZ3MsIHNraXBMYXp5TG9hZCkge1xuICAgIGlmICh0eXBlb2YgY29udGV4dElkID09ICdzdHJpbmcnICYmICFza2lwTGF6eUxvYWQpIHtcbiAgICAgIGlmICghQmFja2JvbmUuQ29sbGVjdGlvbi5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywgY29udGV4dElkKSkge1xuICAgICAgICBpZiAoIXNldHRpbmdzKSB7XG4gICAgICAgICAgc2V0dGluZ3MgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbW9kZWwgPSBuZXcgQ29udGV4dE1vZGVsKHsgaWQ6IGNvbnRleHRJZCwgc2V0dGluZ3M6IHNldHRpbmdzIH0pO1xuICAgICAgICB0aGlzLmFkZChtb2RlbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBCYWNrYm9uZS5Db2xsZWN0aW9uLnByb3RvdHlwZS5nZXQuY2FsbCh0aGlzLCBjb250ZXh0SWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb252ZW5pZW5jZSB3cmFwcGVyIGZvciAnZ2V0JyB0byBlbnN1cmUgdGhhdCBhIGNvbnRleHQgZXhpc3RzLlxuICAgKlxuICAgKiBAbm90ZSB0aGlzIGRvZXMgbm90IHJldHVybiB0aGUgY29udGV4dC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRleHRJZFxuICAgKiAgIFRoZSBjb250ZXh0IGlkIHRvIGVuc3VyZSBleGlzdHMuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICB0b3VjaDogZnVuY3Rpb24oY29udGV4dElkKSB7XG4gICAgdGhpcy5nZXQoY29udGV4dElkKTtcbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIHRoZSBsb2dpYyBmb3IgZXhlY3V0aW5nIGNvbW1hbmRzIGZyb20gdGhlIHF1ZXVlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgRWRpdEJ1ZmZlckl0ZW1Nb2RlbCA9IHJlcXVpcmUoJy4uL01vZGVscy9FZGl0QnVmZmVySXRlbU1vZGVsJyk7XG5cbi8qKlxuICogQmFja2JvbmUgQ29sbGVjdGlvbiBmb3IgZWRpdCBidWZmZXIgaXRlbSBtb2RlbHMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXG4gIG1vZGVsOiBFZGl0QnVmZmVySXRlbU1vZGVsLFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24obW9kZWxzLCBvcHRpb25zKSB7XG4gICAgdGhpcy5fY29udGV4dElkID0gb3B0aW9ucy5jb250ZXh0SWQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBhbiBlZGl0IGJ1ZmZlciBpdGVtIG1vZGVsLlxuICAgKlxuICAgKiBMb2FkcyB0aGUgaXRlbSBmcm9tIHRoZSBzZXJ2ZXIgaXQgZG9lcyBub3QgY3VycmVudGx5IGV4aXN0IGluIHRoZSBjbGllbnQtc2lkZVxuICAgKiBidWZmZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7Q29tbWFuZEVtaXR0ZXJ9IGNvbW1hbmRFbWl0dGVyXG4gICAqICAgVGhlIGVkaXRvciBjb21tYW5kIGVtaXR0ZXIgdG8gdXNlIGluIGNhc2UgdGhlIGl0ZW0gY2Fubm90IGJlIGZvdW5kXG4gICAqICAgbG9jYWxseS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHV1aWRcbiAgICogICBUaGUgZWRpdCBidWZmZXIgaXRlbSBpZCB0byBnZXQuXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLk1vZGVsfVxuICAgKiAgIFRoZSBidWZmZXIgaXRlbSBtb2RlbC5cbiAgICovXG4gIGdldEl0ZW06IGZ1bmN0aW9uKGNvbW1hbmRFbWl0dGVyLCB1dWlkKSB7XG4gICAgdmFyIGl0ZW1Nb2RlbCA9IHRoaXMuZ2V0KHV1aWQpO1xuICAgIGlmICghaXRlbU1vZGVsKSB7XG4gICAgICBpdGVtTW9kZWwgPSB0aGlzLmFkZCh7aWQ6IHV1aWR9LCB7bWVyZ2U6IHRydWV9KTtcbiAgICAgIGNvbW1hbmRFbWl0dGVyLnJlbmRlcih0aGlzLmdldENvbnRleHRJZCgpLCB1dWlkKTtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZW1Nb2RlbDtcbiAgfSxcblxuICAvKipcbiAgICogUHJvdmlkZXMgYSBjb25zaXN0ZW50ICdzZXR0ZXInIEFQSSB3cmFwcGVyLlxuICAgKlxuICAgKiBAcGFyYW0ge0JhY2tib25lLk1vZGVsfSBpdGVtTW9kZWxcbiAgICogICBUaGUgbW9kZWwgdG8gYmUgc2V0IGluIHRoZSBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHttaXhlZH1cbiAgICogICBTZWUgcmV0dXJuIHZhbHVlIGZvciBCYWNrYm9uZS5Db2xsZWN0aW9uLmFkZC5cbiAgICovXG4gIHNldEl0ZW06IGZ1bmN0aW9uKGl0ZW1Nb2RlbCkge1xuICAgIHJldHVybiB0aGlzLmFkZChpdGVtTW9kZWwsIHttZXJnZTogdHJ1ZX0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBQcm92aWRlcyBhIGNvbnNpc3RlbnQgQVBJIHdyYXBwZXIgZm9yIHJlbW92aW5nIGl0ZW1zLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXVpZFxuICAgKiAgIFRoZSB1dWlkIHRvIGJlIHJlbW92ZWQgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICByZW1vdmVJdGVtOiBmdW5jdGlvbih1dWlkKSB7XG4gICAgdGhpcy5yZW1vdmUodXVpZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGNvbnRleHQgaWQgdGhpcyBlZGl0IGJ1ZmZlciBiZWxvbmdzIHRvLlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqICAgVGhlIGNvbnRleHQgaWQuXG4gICAqL1xuICBnZXRDb250ZXh0SWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9jb250ZXh0SWQ7XG4gIH1cbn0pO1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIEVkaXRvck1vZGVsID0gcmVxdWlyZSgnLi4vTW9kZWxzL0VkaXRvck1vZGVsJyk7XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgbW9kZWw6IEVkaXRvck1vZGVsLFxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIGNvbGxlY3Rpb24gb2Ygc2NoZW1hIGVudHJ5IG1vZGVsc1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgU2NoZW1hTW9kZWwgPSByZXF1aXJlKCcuLi9Nb2RlbHMvU2NoZW1hTW9kZWwnKTtcblxuLyoqXG4gKiBCYWNrYm9uZSBDb2xsZWN0aW9uIGZvciBzY2hlbWEgbW9kZWxzLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBhdWdtZW50cyBCYWNrYm9uZS5Nb2RlbFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblxuICBtb2RlbDogU2NoZW1hTW9kZWwsXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmxpc3RlblRvKG9wdGlvbnMuY29udGV4dENvbGxlY3Rpb24sICdhZGQnLCB0aGlzLmFkZENvbnRleHRTY2hlbWEpO1xuICAgIHRoaXMuX2Rpc3BhdGNoZXIgPSBvcHRpb25zLmRpc3BhdGNoZXI7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiBhIHR5cGUgaXMgYWxsb3dlZCB3aXRoaW4gYSBnaXZlbiBzY2hlbWEgbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHNjaGVtYUlkXG4gICAqICAgVGhlIHNjaGVtYSBpZCB0byBjaGVjayB3aXRoaW4uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgVGhlIHR5cGUgdG8gY2hlY2sgZm9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtib29sfVxuICAgKiAgIFRydWUgaWYgdGhlIHR5cGUgaXMgYWxsb3dlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgaXNBbGxvd2VkOiBmdW5jdGlvbihzY2hlbWFJZCwgdHlwZSkge1xuICAgIHZhciBtb2RlbCA9IHRoaXMuZ2V0KHNjaGVtYUlkKTtcbiAgICByZXR1cm4gISEobW9kZWwgJiYgbW9kZWwuZ2V0KCdhbGxvd2VkJylbdHlwZV0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBzY2hlbWEgZm9yIGEgZ2l2ZW4gY29udGV4dC5cbiAgICpcbiAgICogQHBhcmFtIHtDb250ZXh0fSBjb250ZXh0TW9kZWxcbiAgICogICBUaGUgY29udGV4dCB0byBhZGQgdGhlIHNjaGVtYSBmb3IuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBhZGRDb250ZXh0U2NoZW1hOiBmdW5jdGlvbihjb250ZXh0TW9kZWwpIHtcbiAgICB0aGlzLl9mZXRjaFNjaGVtYShjb250ZXh0TW9kZWwpO1xuICAgIHRoaXMubGlzdGVuVG8oY29udGV4dE1vZGVsLCAnY2hhbmdlOnNjaGVtYUlkJywgdGhpcy5fZmV0Y2hTY2hlbWEpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gZmV0Y2ggdGhlIHNjaGVtYSBmb3IgYSBtb2RlbCBpZiBpdCBkb2Vzbid0IGV4aXN0LlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbnRleHR9IGNvbnRleHRNb2RlbFxuICAgKiAgIFRoZSBtb2RlbCB0byBmZXRjaCB0aGUgc2NoZW1hIGZvci5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF9mZXRjaFNjaGVtYTogZnVuY3Rpb24oY29udGV4dE1vZGVsKSB7XG4gICAgdmFyIGlkID0gY29udGV4dE1vZGVsLmdldCgnc2NoZW1hSWQnKTtcbiAgICBpZiAoaWQpIHtcbiAgICAgIGlmICghdGhpcy5nZXQoaWQpKSB7XG4gICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goJ0ZFVENIX1NDSEVNQScsIGlkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgV2lkZ2V0TW9kZWwgPSByZXF1aXJlKCcuLi9Nb2RlbHMvV2lkZ2V0TW9kZWwnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICBtb2RlbDogV2lkZ2V0TW9kZWwsXG59KTtcblxuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYSBtZWNoYW5pc20gZm9yIGNvbnRyb2xsaW5nIHN1YnNjcmlwdGlvbnMgdG8gbXVsdGlwbGUgY29udGV4dHMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG4vKipcbiAqIExpc3RlbnMgdG8gYSBncm91cCBvZiBjb250ZXh0J3MgZWRpdCBidWZmZXJzLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCBCYWNrYm9uZS5FdmVudHMsIHtcblxuICAvKipcbiAgICogQWRkIGEgY29udGV4dCB0byB0aGUgbGlzdGVuZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7Q29udGV4dH0gY29udGV4dFxuICAgKiAgIFRoZSBjb250ZXh0IHRvIGxpc3RlbiB0by5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBhZGRDb250ZXh0OiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgdGhpcy5saXN0ZW5Ubyhjb250ZXh0LmVkaXRCdWZmZXIsICdhZGQnLCB0aGlzLl90cmlnZ2VyRXZlbnRzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogRW1pdHMgYW4gJ2luc2VydEl0ZW0nIG9yICd1cGRhdGVJdGVtJyBldmVudCBmb3IgYSBtb2RlbC5cbiAgICpcbiAgICogQHBhcmFtIHtFZGl0QnVmZmVySXRlbU1vZGVsfSBidWZmZXJJdGVtTW9kZWxcbiAgICogICBUaGUgbW9kZWwgdGhhdCB0aGUgZXZlbnQgaXMgYmVpbmcgdHJpZ2dlcmVkIGZvci5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF90cmlnZ2VyRXZlbnRzOiBmdW5jdGlvbihidWZmZXJJdGVtTW9kZWwpIHtcbiAgICBpZiAoYnVmZmVySXRlbU1vZGVsLmdldCgnaW5zZXJ0JykpIHtcbiAgICAgIHRoaXMudHJpZ2dlcignaW5zZXJ0SXRlbScsIGJ1ZmZlckl0ZW1Nb2RlbCk7XG4gICAgICBidWZmZXJJdGVtTW9kZWwuc2V0KHtpbnNlcnQ6IGZhbHNlfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy50cmlnZ2VyKCd1cGRhdGVJdGVtJywgYnVmZmVySXRlbU1vZGVsKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIENsZWFucyB1cCBhZnRlciB0aGUgb2JqZWN0IHdoZW4gaXQgaXMgcmVhZHkgdG8gYmUgZGVzdHJveWVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgY2xlYW51cDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgdGhlIGxvZ2ljIGZvciBleGVjdXRpbmcgY29tbWFuZHMgZnJvbSB0aGUgcXVldWUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBBIGNsYXNzIGZvciByZXNvbHZpbmcgdGhlIGFzc2ljdWF0ZWQgY29udGV4dChzKSBmb3IgYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge0NvbmV4dENvbGxlY3Rpb259IGNvbnRleHRDb2xsZWN0aW9uXG4gKiAgIFRoZSBjb250ZXh0Q29sbGVjdGlvbiB0byB1c2UgdG8gbG9va3VwIGNvbnRleHRzLlxuICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUNvbnRleHRBdHRyaWJ1dGVcbiAqICAgVGhlIHNvdXJjZSBjb250ZXh0IGF0dHJpYnV0ZSBuYW1lLlxuICogQHBhcmFtIHtzdHJpbmd9IHRhcmdldENvbnRleHRBdHRyaWJ1dGVcbiAqICAgVGhlIHRhcmdldCBjb250ZXh0IGF0dHJpYnV0ZSBuYW1lLlxuICogQHBhcmFtIHtDb250ZXh0fSBlZGl0b3JDb250ZXh0XG4gKiAgIFRoZSByb290IGNvbnRleHQgb2YgdGhlIGVkaXRvciBpbnN0YW5jZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0Q29sbGVjdGlvbiwgc291cmNlQ29udGV4dEF0dHJpYnV0ZSwgdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZSwgZWRpdG9yQ29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbiA9IGNvbnRleHRDb2xsZWN0aW9uO1xuICB0aGlzLl9zb3VyY2VDb250ZXh0QXR0cmlidXRlID0gc291cmNlQ29udGV4dEF0dHJpYnV0ZTtcbiAgdGhpcy5fdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZSA9IHRhcmdldENvbnRleHRBdHRyaWJ1dGU7XG4gIHRoaXMuX2VkaXRvckNvbnRleHQgPSBlZGl0b3JDb250ZXh0O1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIFJlc29sdmVzIHRoZSBjb250ZXh0IG9mIGFuIGVsZW1lbnQgYmFzZWQgb24gaXRzIHBvc2l0aW9uIGluIHRoZSBlZGl0b3IuXG4gICAqXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxcbiAgICogICBUaGUgZWxlbWVudCB0byByZXNvbHZlIHRoZSBjb250ZXh0IG9mLlxuICAgKlxuICAgKiBAcmV0dXJuIHtCYWNrYm9uZS5Nb2RlbH1cbiAgICogICBUaGUgY29udGV4dCBtb2RlbCBhc3NvY2lhdGVkIHdpdGggdGhlIGVsZW1lbnQuXG4gICAqL1xuICByZXNvbHZlVGFyZ2V0Q29udGV4dDogZnVuY3Rpb24gKCRlbCkge1xuICAgIHZhciBjb250ZXh0SWQgPSAkZWwuYXR0cih0aGlzLl90YXJnZXRDb250ZXh0QXR0cmlidXRlKTtcbiAgICBpZiAoIWNvbnRleHRJZCkge1xuICAgICAgY29udGV4dElkID0gJGVsLmNsb3Nlc3QoJ1snICsgdGhpcy5fdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZSArICddJykuYXR0cih0aGlzLl90YXJnZXRDb250ZXh0QXR0cmlidXRlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXQoY29udGV4dElkKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVzb2x2ZXMgdGhlIGNvbnRleHQgYW4gZWxlbWVudCBoYXMgYmVlbiB0YWdnZWQgd2l0aC5cbiAgICpcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbFxuICAgKiAgIFRoZSBlbGVtZW50IHRvIHJlc29sdmUgdGhlIGNvbnRleHQgb2YuXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLk1vZGVsfVxuICAgKiAgIFRoZSBjb250ZXh0IG1vZGVsIGFzc29jaWF0ZWQgd2l0aCB0aGUgZWxlbWVudC5cbiAgICovXG4gIHJlc29sdmVTb3VyY2VDb250ZXh0OiBmdW5jdGlvbigkZWwpIHtcbiAgICB2YXIgY29udGV4dElkID0gJGVsLmF0dHIodGhpcy5fc291cmNlQ29udGV4dEF0dHJpYnV0ZSk7XG4gICAgcmV0dXJuIGNvbnRleHRJZCA/IHRoaXMuZ2V0KGNvbnRleHRJZCkgOiB0aGlzLl9lZGl0b3JDb250ZXh0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSByb290IGVkaXRvciBjb250ZXh0LlxuICAgKlxuICAgKiBAcmV0dXJuIHtCYWNrYm9uZS5Nb2RlbH1cbiAgICogICBUaGUgcm9vdCBlZGl0b3IgY29udGV4dC5cbiAgICovXG4gIGdldEVkaXRvckNvbnRleHQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9lZGl0b3JDb250ZXh0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIGEgY29udGV4dCBiYXNlZCBvbiBpdHMgY29udGV4dCBpZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRleHRJZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgY29udGV4dCB0byBnZXQuXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLk1vZGVsfVxuICAgKiAgIFRoZSBjb250ZXh0IG1vZGVsLlxuICAgKi9cbiAgZ2V0OiBmdW5jdGlvbihjb250ZXh0SWQpIHtcbiAgICBpZiAoY29udGV4dElkKSB7XG4gICAgICB2YXIgc2V0dGluZ3MgPSB0aGlzLl9lZGl0b3JDb250ZXh0ID8gdGhpcy5fZWRpdG9yQ29udGV4dC5nZXQoJ3NldHRpbmdzJykgOiB7fTtcbiAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbi5nZXQoY29udGV4dElkLCBzZXR0aW5ncyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX2VkaXRvckNvbnRleHQ7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBFbnN1cmVzIHRoYXQgYSBjb250ZXh0IGV4aXN0cyBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRleHRJZFxuICAgKiAgIFRoZSBjb250ZXh0IGlkIHRvIGVuc3VyZSBleGlzdHMuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICB0b3VjaDogZnVuY3Rpb24oY29udGV4dElkKSB7XG4gICAgdGhpcy5fY29udGV4dENvbGxlY3Rpb24udG91Y2goY29udGV4dElkKTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhbiBhY3Rpb25hYmxlIHJlZmVyZW5jZSB0byBhIGVkaXQgYnVmZmVyIGl0ZW0uXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVmZXJlbmNlIHRvIGFuIGVkaXQgYnVmZmVyIGl0ZW0uXG4gKlxuICogQHBhcmFtIHtFZGl0QnVmZmVySXRlbU1vZGVsfSBidWZmZXJJdGVtTW9kZWxcbiAqICAgVGhlIG1vZGVsIHRoaXMgd2lsbCByZWZlcmVuY2UuXG4gKiBAcGFyYW0ge0NvbnRleHR9IHNvdXJjZUNvbnRleHRcbiAqICAgVGhlIGNvbnRleHQgdGhlIGVkaXQgYnVmZmVyIGl0ZW0gc2F5cyBpdCBiZWxvbmdzIHRvLlxuICogQHBhcmFtIHtDb25leHR9IHRhcmdldENvbnRleHRcbiAqICAgVGhlIGNvbnRleHQgdGhlIGVkaXQgYnVmZmVyIGl0ZW0ncyBhc3NvY2lhdGVkIHdpZGdldCBsaXZlcyBpbi5cbiAqIEBwYXJhbSB7Q29tbWFuZEVtaXR0ZXJ9IGNvbW1hbmRFbWl0dGVyXG4gKiAgIEEgY29tbWFuZCBlbWl0dGVyIGZvciBlbWl0dGluZyBjb21tYW5kcyByZWxhdGVkIHRvIHRoZSByZWZlcmVuY2VkIGVkaXRcbiAqICAgYnVmZmVyIGl0ZW0uXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYnVmZmVySXRlbU1vZGVsLCBzb3VyY2VDb250ZXh0LCB0YXJnZXRDb250ZXh0LCBjb21tYW5kRW1pdHRlcikge1xuICB0aGlzLmVkaXRCdWZmZXJJdGVtID0gYnVmZmVySXRlbU1vZGVsOyBcbiAgdGhpcy5zb3VyY2VDb250ZXh0ID0gc291cmNlQ29udGV4dDsgXG4gIHRoaXMudGFyZ2V0Q29udGV4dCA9IHRhcmdldENvbnRleHQ7IFxuICB0aGlzLl9jb21tYW5kRW1pdHRlciA9IGNvbW1hbmRFbWl0dGVyOyBcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBJc3N1ZXMgYW4gZWRpdCBjb21tYW5kIGZvciB0aGUgcmVmZXJlbmNlZCBidWZmZXIgaXRlbS5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgd2hlcmUga2V5cyBhcmUgY29udGV4dCBpZHMgYW5kIHZhbHVlcyBhcmUgdGhlaXIgYXNzb2NpYXRlZCBpbmxpbmVcbiAgICogICBlZGl0cy5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGVkaXQ6IGZ1bmN0aW9uKGVkaXRzKSB7XG4gICAgdGhpcy5fY29tbWFuZEVtaXR0ZXIuZWRpdCh0aGlzLnRhcmdldENvbnRleHQuZ2V0KCdpZCcpLCB0aGlzLmVkaXRCdWZmZXJJdGVtLmdldCgnaWQnKSwgZWRpdHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJc3N1ZXMgYSByZW5kZXIgY29tbWFuZCBmb3IgdGhlIHJlZmVyZW5jZWQgYnVmZmVyIGl0ZW0uXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBlZGl0c1xuICAgKiAgIEEgbWFwIHdoZXJlIGtleXMgYXJlIGNvbnRleHQgaWRzIGFuZCB2YWx1ZXMgYXJlIHRoZWlyIGFzc29jaWF0ZWQgaW5saW5lXG4gICAqICAgZWRpdHMuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKGVkaXRzKSB7XG4gICAgdGhpcy5fY29tbWFuZEVtaXR0ZXIucmVuZGVyKHRoaXMudGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyksIHRoaXMuZWRpdEJ1ZmZlckl0ZW0uZ2V0KCdpZCcpLCBlZGl0cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIElzc3VlcyBhIGR1cGxpY2F0ZSBjb21tYW5kIGZvciB0aGUgcmVmZXJlbmNlZCBidWZmZXIgaXRlbS5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gd2lkZ2V0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIHdpZGdldCB0aGF0IHdpbGwgcmVjaWV2ZSB0aGUgZHVwbGljYXRlLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZWRpdHNcbiAgICogICBBIG1hcCB3aGVyZSBrZXlzIGFyZSBjb250ZXh0IGlkcyBhbmQgdmFsdWVzIGFyZSB0aGVpciBhc3NvY2lhdGVkIGlubGluZVxuICAgKiAgIGVkaXRzLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZHVwbGljYXRlOiBmdW5jdGlvbih3aWRnZXRJZCwgZWRpdHMpIHtcbiAgICB0aGlzLl9jb21tYW5kRW1pdHRlci5kdXBsaWNhdGUodGhpcy50YXJnZXRDb250ZXh0LmdldCgnaWQnKSwgdGhpcy5zb3VyY2VDb250ZXh0LmdldCgnaWQnKSwgdGhpcy5lZGl0QnVmZmVySXRlbS5nZXQoJ2lkJyksIHdpZGdldElkLCBlZGl0cyk7XG4gIH1cblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhIGZhY3RvcnkgZm9yIGNyZWF0aW5nIGVkaXQgYnVmZmVyIGl0ZW0gcmVmZXJlbmNlcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBFZGl0QnVmZmVySXRlbVJlZiA9IHJlcXVpcmUoJy4vRWRpdEJ1ZmZlckl0ZW1SZWYnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0UmVzb2x2ZXIsIGNvbW1hbmRFbWl0dGVyKSB7XG4gIHRoaXMuX2NvbnRleHRSZXNvbHZlciA9IGNvbnRleHRSZXNvbHZlcjtcbiAgdGhpcy5fY29tbWFuZEVtaXR0ZXIgPSBjb21tYW5kRW1pdHRlcjtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIGNyZWF0ZTogZnVuY3Rpb24oYnVmZmVySXRlbU1vZGVsLCBzb3VyY2VDb250ZXh0LCB0YXJnZXRDb250ZXh0KSB7XG4gICAgdmFyIGZhbGxiYWNrQ29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5nZXQoYnVmZmVySXRlbU1vZGVsLmNvbGxlY3Rpb24uZ2V0Q29udGV4dElkKCkpO1xuXG4gICAgaWYgKCFzb3VyY2VDb250ZXh0KSB7XG4gICAgICBzb3VyY2VDb250ZXh0ID0gZmFsbGJhY2tDb250ZXh0O1xuICAgIH1cblxuICAgIGlmICghdGFyZ2V0Q29udGV4dCkge1xuICAgICAgdGFyZ2V0Q29udGV4dCA9IGZhbGxiYWNrQ29udGV4dDtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEVkaXRCdWZmZXJJdGVtUmVmKGJ1ZmZlckl0ZW1Nb2RlbCwgc291cmNlQ29udGV4dCwgdGFyZ2V0Q29udGV4dCwgdGhpcy5fY29tbWFuZEVtaXR0ZXIpO1xuICB9LFxuXG4gIGNyZWF0ZUZyb21JZHM6IGZ1bmN0aW9uKGl0ZW1JZCwgc291cmNlQ29udGV4dElkLCB0YXJnZXRDb250ZXh0SWQpIHtcbiAgICBpZiAoIXNvdXJjZUNvbnRleHRJZCB8fCAhdGFyZ2V0Q29udGV4dElkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NvdXJjZSBhbmQgdGFyZ2V0IGNvbnRleHQgaWRzIGFyZSBleHBsaWNpdGx5IHJlcXVpcmVkJyk7XG4gICAgfVxuICAgIHZhciBzb3VyY2VDb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldChzb3VyY2VDb250ZXh0SWQpO1xuICAgIHZhciB0YXJnZXRDb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldCh0YXJnZXRDb250ZXh0SWQpO1xuICAgIHZhciBidWZmZXJJdGVtTW9kZWwgPSBzb3VyY2VDb250ZXh0LmVkaXRCdWZmZXIuZ2V0SXRlbSh0aGlzLl9jb21tYW5kRW1pdHRlciwgaXRlbUlkKTtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGUoYnVmZmVySXRlbU1vZGVsLCBzb3VyY2VDb250ZXh0LCB0YXJnZXRDb250ZXh0KTtcbiAgfSxcblxuICByZXF1ZXN0TmV3SXRlbTogZnVuY3Rpb24odGFyZ2V0Q29udGV4dCwgdHlwZSl7XG4gICAgdGhpcy5fY29tbWFuZEVtaXR0ZXIuaW5zZXJ0KHRhcmdldENvbnRleHQsIHR5cGUpO1xuICB9LFxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGEgbWVkaWF0b3IgZm9yIG5lZ290aWF0aW5nIHRoZSBpbnNlcnRpb24gb2YgbmV3IGl0ZW1zLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuLyoqXG4gKiBBIGNsYXNzIGZvciBtZWRpYXRpbmcgcmVxdWVzdHMgZm9yIG5ldyBlZGl0IGJ1ZmZlciBpdGVtcyBmcm9tIHRoZSBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIHtFZGl0QnVmZmVySXRlbVJlZkZhY3Rvcnl9IGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeVxuICogICBUaGUgZmFjdG9yeSB0byB1c2UgZm9yIGNyZWF0aW5nIGVkaXQgYnVmZmVyIGl0ZW0gcmVmZXJlbmNlcy5cbiAqIEBwYXJhbSB7RWxlbWVudEZhY3Rvcnl9IGVsZW1lbnRGYWN0b3J5XG4gKiAgIFRoZSBmYWN0b3J5IHRvIHVzZSBmb3IgY3JlYXRpbmcgZW1iZWRhYmxlIHdpZGdldCBlbGVtZW50cy5cbiAqIEBwYXJhbSB7Q29udGV4dExpc3RlbmVyfSBjb250ZXh0TGlzdGVuZXJcbiAqICAgVGhlIGxpc3RlbmVyIHRoYXQgbGlzdGVucyBmb3IgbmV3IGVkaXQgYnVmZmVyIGl0ZW1zIGJlaW5nIGRlbGl2ZXJlZC5cbiAqIEBwYXJhbSB7RWRpdG9yQWRhcHRlcn0gYWRhcHRlclxuICogICBUaGUgZWRpdG9yIGFkYXB0ZXIgdGhhdCBoYW5kbGVzIGluc2VydGlvbiBvZiBuZXcgZW1iZWQgY29kZXMgaW50byB0aGVcbiAqICAgZWRpdG9yLlxuICogQHBhcmFtIHtDb250ZXh0UmVzb2x2ZXJ9IGNvbnRleHRSZXNvbHZlclxuICogICBUaGUgY29udGV4dCByZXNvbHZlciB0byB1c2UgZm9yIHJlc29sdmluZyB0aGUgY29udGV4dCB0aGF0IGEgd2lkZ2V0IGlzXG4gKiAgIGJlaW5nIGluc2VydGVkIGludG8uXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LCBlbGVtZW50RmFjdG9yeSwgY29udGV4dExpc3RlbmVyLCBhZGFwdGVyLCBjb250ZXh0UmVzb2x2ZXIpIHtcbiAgdGhpcy5fZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5ID0gZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5O1xuICB0aGlzLl9lbGVtZW50RmFjdG9yeSA9IGVsZW1lbnRGYWN0b3J5O1xuICB0aGlzLl9jb250ZXh0TGlzdGVuZXIgPSBjb250ZXh0TGlzdGVuZXI7XG4gIHRoaXMuX2FkYXB0ZXIgPSBhZGFwdGVyO1xuICB0aGlzLl9jb250ZXh0UmVzb2x2ZXIgPSBjb250ZXh0UmVzb2x2ZXI7XG4gIHRoaXMubGlzdGVuVG8odGhpcy5fY29udGV4dExpc3RlbmVyLCAnaW5zZXJ0SXRlbScsIHRoaXMuX2luc2VydEJ1ZmZlckl0ZW0pO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCBCYWNrYm9uZS5FdmVudHMsIHtcblxuICAvKipcbiAgICogVHJpZ2dlcnMgdGhlIHdpZGdldCBpbnNlcnRpb24gZmxvdy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogICBUaGUgdHlwZSBuYW1lIG9mIHRoZSB3aWRnZXQgdG8gaW5zZXJ0LlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsXG4gICAqICAgVGhlIGluc2VydGlvbiBwb2ludCBmb3IgdGhlIG5ldyBpdGVtIGJlaW5nIHJlcXVlc3RlZC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIHJlcXVlc3RCdWZmZXJJdGVtOiBmdW5jdGlvbih0eXBlLCAkZWwpIHtcbiAgICB2YXIgdGFyZ2V0Q29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5yZXNvbHZlVGFyZ2V0Q29udGV4dCgkZWwpO1xuICAgIHRoaXMuX2NvbnRleHRMaXN0ZW5lci5hZGRDb250ZXh0KHRhcmdldENvbnRleHQpO1xuICAgIHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeS5yZXF1ZXN0TmV3SXRlbSh0YXJnZXRDb250ZXh0LmdldCgnaWQnKSwgdHlwZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENsZWFucyB1cCB0aGUgbWVkaWF0b3IgaW4gcHJlcGFyYXRpb24gZm9yIGRlc3RydWN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgY2xlYW51cDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY29udGV4dExpc3RlbmVyLmNsZWFudXAoKTtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgfSxcblxuICAvKipcbiAgICogSGFuZGxlciBmb3IgbmV3IGVkaXQgYnVmZmVyIGl0ZW1zIGJlaW5nIGRlbGl2ZXJlZC5cbiAgICpcbiAgICogQHBhcmFtIHtFZGl0QnVmZmVySXRlbU1vZGVsfSBidWZmZXJJdGVtTW9kZWxcbiAgICogICBUaGUgbmV3IG1vZGVsIGJlaW5nIGluc2VydGVkXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBfaW5zZXJ0QnVmZmVySXRlbTogZnVuY3Rpb24oYnVmZmVySXRlbU1vZGVsKSB7XG4gICAgdmFyIGl0ZW0gPSB0aGlzLl9lZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkuY3JlYXRlKGJ1ZmZlckl0ZW1Nb2RlbCk7XG5cbiAgICAvLyBJZiB0aGUgbmV3IG1vZGVsIGlzIHJlYWR5IHRvIGJlIGluc2VydGVkLCBpbnNlcnQgYW4gZW1iZWQgY29kZSBpblxuICAgIC8vIEVkaXRvciBhbmQgbWFyayB0aGUgbW9kZWwgYXMgaW5zZXJ0ZWQuXG4gICAgdmFyIGVtYmVkQ29kZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmNyZWF0ZSgnd2lkZ2V0Jywge1xuICAgICAgdXVpZDogYnVmZmVySXRlbU1vZGVsLmdldCgnaWQnKSxcbiAgICAgIGNvbnRleHQ6IGl0ZW0udGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyksXG4gICAgfSk7XG4gICAgZW1iZWRDb2RlLnNldEF0dHJpYnV0ZSgnPHZpZXdtb2RlPicsICdlZGl0b3InKTtcbiAgICB0aGlzLl9hZGFwdGVyLmluc2VydEVtYmVkQ29kZShlbWJlZENvZGUpO1xuICB9XG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgdGhlIGxvZ2ljIGZvciBleGVjdXRpbmcgZWRpdG9yIGNvbW1hbmRzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIENvbW1hbmRFbWl0dGVyIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge1N5bmNBY3Rpb25EaXNwYXRjaGVyfSBkaXNwYXRjaGVyXG4gKiAgIFRoZSBhY3Rpb24gZGlzcGF0Y2hlciB0byB1c2UgZm9yIGRpc3BhdGNoaW5nIGNvbW1hbmRzLlxuICogQHBhcmFtIHtDb250ZXh0UmVzb2x2ZXJ9IGNvbnRleHRSZXNvbHZlclxuICogICBUaGUgY29udGV4dCByZXNvbHZlciB1c2VkIHRvIGxvb2t1cCBjb250ZXh0IG1vZGVscyBhc3NvY2lhdGVkIHdpdGhcbiAqICAgY29tbWFuZHMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGlzcGF0Y2hlciwgY29udGV4dFJlc29sdmVyKSB7XG4gIHRoaXMuX2Rpc3BhdGNoZXIgPSBkaXNwYXRjaGVyO1xuICB0aGlzLl9jb250ZXh0UmVzb2x2ZXIgPSBjb250ZXh0UmVzb2x2ZXI7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogRXhlY3V0ZXMgYW4gXCJpbnNlcnRcIiBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdGFyZ2V0Q29udGV4dElkXG4gICAqICAgVGhlIGlkIG9mIHRoZSBjb250ZXh0IHRoZSBuZXcgaXRlbSB3aWxsIGJlIGluc2VydGVkIGludG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgVGhlIHR5cGUgdG8gaW5zZXJ0LiBUaGlzIGlzIG9wdGlvbmFsLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgaW5zZXJ0OiBmdW5jdGlvbih0YXJnZXRDb250ZXh0SWQsIHR5cGUpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIGNvbW1hbmQ6ICdpbnNlcnQnLFxuICAgICAgdGFyZ2V0Q29udGV4dDogdGFyZ2V0Q29udGV4dElkLFxuICAgIH07XG5cbiAgICBpZiAodHlwZSkge1xuICAgICAgb3B0aW9ucy50eXBlID0gdHlwZTtcbiAgICB9XG5cbiAgICB0aGlzLl9leGVjdXRlKCdJTlNFUlRfSVRFTScsIG9wdGlvbnMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBFeGVjdXRlcyBhbiBcImVkaXRcIiBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdGFyZ2V0Q29udGV4dElkXG4gICAqICAgVGhlIGlkIG9mIHRoZSBjb250ZXh0IHRoZSBidWZmZXIgaXRlbSBiZWxvbmdzIHRvLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaXRlbUlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSBidWZmZXIgaXRlbSB0byBiZSBlZGl0ZWQuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBlZGl0c1xuICAgKiAgIEEgbWFwIG9mIGlubGluZSBlZGl0cyB0byBiZSBwcmVzZXJ2ZWQuIFNlZSBXaWRnZXRNb2RlbCBmb3IgdGhlIGZvcm1hdCBvZlxuICAgKiAgIGlubGluZSBlZGl0cy5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGVkaXQ6IGZ1bmN0aW9uKHRhcmdldENvbnRleHRJZCwgaXRlbUlkLCBlZGl0cykge1xuICAgIHRoaXMuX2V4ZWN1dGUoJ0VESVRfSVRFTScsIHtcbiAgICAgIGNvbW1hbmQ6ICdlZGl0JyxcbiAgICAgIHRhcmdldENvbnRleHQ6IHRhcmdldENvbnRleHRJZCxcbiAgICAgIGl0ZW1JZDogaXRlbUlkLFxuICAgICAgZWRpdHM6IGVkaXRzXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIGEgXCJyZW5kZXJcIiBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdGFyZ2V0Q29udGV4dElkXG4gICAqICAgVGhlIGlkIG9mIHRoZSBjb250ZXh0IHRoZSBidWZmZXIgaXRlbSBiZWxvbmdzIHRvLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaXRlbUlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSBidWZmZXIgaXRlbSB0byBiZSByZW5kZXJlZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgb2YgaW5saW5lIGVkaXRzIHRvIGJlIHByZXNlcnZlZC4gU2VlIFdpZGdldE1vZGVsIGZvciB0aGUgZm9ybWF0IG9mXG4gICAqICAgaW5saW5lIGVkaXRzLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbih0YXJnZXRDb250ZXh0SWQsIGl0ZW1JZCwgZWRpdHMpIHtcbiAgICB0aGlzLl9leGVjdXRlKCdSRU5ERVJfSVRFTScsIHtcbiAgICAgIGNvbW1hbmQ6ICdyZW5kZXInLFxuICAgICAgdGFyZ2V0Q29udGV4dDogdGFyZ2V0Q29udGV4dElkLFxuICAgICAgaXRlbUlkOiBpdGVtSWQsXG4gICAgICBlZGl0czogZWRpdHNcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRXhlY3V0ZXMgYW4gXCJkdXBsaWNhdGVcIiBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdGFyZ2V0Q29udGV4dElkXG4gICAqICAgVGhlIGlkIG9mIHRoZSBjb250ZXh0IHRoZSBuZXcgaXRlbSB3aWxsIGJlIGluc2VydGVkIGludG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIGl0ZW0gYmVpbmcgZHVwbGljYXRlZCBiZWxvbmdzIHRvLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaXRlbUlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSBidWZmZXIgaXRlbSB0byBiZSBkdXBsaWNhdGVkLlxuICAgKiBAcGFyYW0ge21peGVkfSB3aWRnZXRJZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgd2lkZ2V0IHRoYXQgd2lsbCBiZSB1cGRhdGVkIHRvIHJlZmVyZW5jZSB0aGUgbmV3bHkgY3JlYXRlZFxuICAgKiAgIGl0ZW0uXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBlZGl0c1xuICAgKiAgIEEgbWFwIG9mIGlubGluZSBlZGl0cyB0byBiZSBwcmVzZXJ2ZWQuIFNlZSBXaWRnZXRNb2RlbCBmb3IgdGhlIGZvcm1hdCBvZlxuICAgKiAgIGlubGluZSBlZGl0cy5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGR1cGxpY2F0ZTogZnVuY3Rpb24odGFyZ2V0Q29udGV4dElkLCBzb3VyY2VDb250ZXh0SWQsIGl0ZW1JZCwgd2lkZ2V0SWQsIGVkaXRzKSB7XG4gICAgdGhpcy5fZXhlY3V0ZSgnRFVQTElDQVRFX0lURU0nLCB7XG4gICAgICBjb21tYW5kOiAnZHVwbGljYXRlJyxcbiAgICAgIHRhcmdldENvbnRleHQ6IHRhcmdldENvbnRleHRJZCxcbiAgICAgIHNvdXJjZUNvbnRleHQ6IHNvdXJjZUNvbnRleHRJZCxcbiAgICAgIGl0ZW1JZDogaXRlbUlkLFxuICAgICAgd2lkZ2V0OiB3aWRnZXRJZCxcbiAgICAgIGVkaXRzOiBlZGl0c1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBjYWxsYmFjayBmb3IgdHJpZ2dlcmluZyB0aGUgY29tbWFuZCB0byBiZSBzZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgKiAgIFRoZSB0eXBlIG9mIGNvbW1hbmQgYmVpbmcgcGVyZm9ybWVkLlxuICAgKiBAcGFyYW0ge29iamVjdH0gY29tbWFuZFxuICAgKiAgIFRoZSBjb21tYW5kIGRhdGEgdG8gYmUgcGFzc2VkIHRvIHRoZSBkaXNwYXRjaGVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX2V4ZWN1dGU6IGZ1bmN0aW9uKHR5cGUsIGNvbW1hbmQpIHtcbiAgICB2YXIgZWRpdG9yQ29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5nZXRFZGl0b3JDb250ZXh0KCk7XG4gICAgY29tbWFuZC5lZGl0b3JDb250ZXh0ID0gZWRpdG9yQ29udGV4dC50b0pTT04oKTtcbiAgICBjb21tYW5kLnNldHRpbmdzID0gZWRpdG9yQ29udGV4dC5nZXQoJ3NldHRpbmdzJyk7XG5cbiAgICBpZiAoY29tbWFuZC5lZGl0cykge1xuICAgICAgY29tbWFuZC5lZGl0YWJsZUNvbnRleHRzID0ge307XG4gICAgICBfLmVhY2goY29tbWFuZC5lZGl0cywgZnVuY3Rpb24odmFsdWUsIGNvbnRleHRJZCkge1xuICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5nZXQoY29udGV4dElkKTtcbiAgICAgICAgY29tbWFuZC5lZGl0YWJsZUNvbnRleHRzW2NvbnRleHRJZF0gPSBjb250ZXh0LnRvSlNPTigpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh0eXBlLCBjb21tYW5kKTtcbiAgfVxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGNyZWF0aW5nIHdpZGdldCBtb2RlbHMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgV2lkZ2V0TW9kZWwgPSByZXF1aXJlKCcuLi8uLi9Nb2RlbHMvV2lkZ2V0TW9kZWwnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgd2lkZ2V0IGZhY3RvcnkuXG4gKlxuICogQHBhcmFtIHtDb250ZXh0UmVzb2x2ZXJ9IGNvbnRleHRSZXNvbHZlclxuICogICBBIGNvbnRleHQgcmVzb2x2ZXIgdG8gdXNlIGZvciByZXNvbHZpbmcgdGhlIHNvdXJjZSBhbmQgdGFyZ2V0IGNvbnRleHRzIGZvclxuICogICBhIHdpZGdldC5cbiAqIEBwYXJhbSB7RWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5fSBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnlcbiAqICAgVGhlIGVkaXQgYnVmZmVyIGl0ZW0gcmVmZXJlbmNlIGZhY3RvcnkgdG8gcGFzcyB0aHJvdWdoIHRvIGNyZWF0ZWQgd2lkZ2V0cy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB1dWlkQXR0cmlidXRlTmFtZVxuICogICBUaGUgbmFtZSBvZiB0aGUgdXVpZCBhdHRyaWJ1dGUgb24gdGhlIHdpZGdldCBlbGVtZW50IHRvIHB1bGwgZWRpdCBidWZmZXJcbiAqICAgaXRlbSBpZHMgZnJvbSB0aGUgRE9NLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRleHRSZXNvbHZlciwgZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LCB1dWlkQXR0cmlidXRlTmFtZSkge1xuICB0aGlzLl9jb250ZXh0UmVzb2x2ZXIgPSBjb250ZXh0UmVzb2x2ZXI7XG4gIHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeSA9IGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeTtcbiAgdGhpcy5fdXVpZEF0dHJpYnV0ZU5hbWUgPSB1dWlkQXR0cmlidXRlTmFtZTtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IHdpZGdldCBtb2RlbCBiYXNlZCBvbiBkYXRhIHByb3ZpZGVkIGJ5IHRoZSBlZGl0b3IuXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IHdpZGdldFxuICAgKiAgIFRoaXMgaXMgYW55IGFyYml0cmFyeSBkYXRhIHRoZSBlZGl0b3IgaW1wbGVtZW50YXRpb24gd2FudHMgdG8gYXNzb2NpYXRlXG4gICAqICAgd2l0aCB0aGUgd2lkZ2V0IG1vZGVsLiBUaGlzIGxldHMgeW91IGFjY2VzcyBlZGl0b3Itc3BlY2lmaWMgd2lkZ2V0IGRhdGFcbiAgICogICBzdHJ1Y3R1cmVzIGZyb20gd2l0aGluIHRoZSBlZGl0b3IgYWRhcHRlci5cbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBBIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgd2lkZ2V0LiBJbiBtb3N0IGNhc2VzLCBpdCBtYWtlcyBzZW5zZSB0byBwYXNzXG4gICAqICAgdGhpcyB0aHJvdWdoIGRpcmVjdGx5IGZyb20gdGhlIGZhY2lsaXR5IHRoYXQgdGhlIGVkaXRvciB1c2VkIHRvIGNyZWF0ZVxuICAgKiAgIHRoZSB3aWRnZXQuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxcbiAgICogICBUaGUgd2lkZ2V0IGVsZW1lbnQuIFRoaXMgd2lsbCBiZSB1c2VkIHRvIGRlcml2ZSB0aGUgY29udGV4dCBiZWluZ1xuICAgKiAgIGluc2VydGVkIGludG8gKHRhcmdldENvbnRleHQpLCB0aGUgY29udGV4dCB0aGUgcmVmZXJlbmNlZCBlZGl0IGJ1ZmZlclxuICAgKiAgIGl0ZW0gY2FtZSBmcm9tIChzb3VyY2VDb250ZXh0KSwgYW5kIHRoZSByZWZlcmVuY2VkIGl0ZW0gaWQuXG4gICAqXG4gICAqIEByZXR1cm4ge1dpZGdldE1vZGVsfVxuICAgKiAgIFRoZSBuZXdseSBjcmVhdGVkIHdpZGdldCBtb2RlbC5cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24od2lkZ2V0LCBpZCwgJGVsKSB7XG4gICAgdmFyIHNvdXJjZUNvbnRleHQgPSB0aGlzLl9jb250ZXh0UmVzb2x2ZXIucmVzb2x2ZVNvdXJjZUNvbnRleHQoJGVsKTtcbiAgICB2YXIgdGFyZ2V0Q29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5yZXNvbHZlVGFyZ2V0Q29udGV4dCgkZWwpO1xuXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBlZGl0QnVmZmVySXRlbVJlZkZhY3Rvcnk6IHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeSxcbiAgICAgIGNvbnRleHRSZXNvbHZlcjogdGhpcy5fY29udGV4dFJlc29sdmVyLFxuICAgICAgd2lkZ2V0OiB3aWRnZXQsXG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgV2lkZ2V0TW9kZWwoe1xuICAgICAgaWQ6IGlkLFxuICAgICAgY29udGV4dElkOiB0YXJnZXRDb250ZXh0LmdldCgnaWQnKSxcbiAgICAgIGl0ZW1JZDogJGVsLmF0dHIodGhpcy5fdXVpZEF0dHJpYnV0ZU5hbWUpLFxuICAgICAgaXRlbUNvbnRleHRJZDogc291cmNlQ29udGV4dC5nZXQoJ2lkJyksXG4gICAgfSwgb3B0aW9ucyk7XG4gIH0sXG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYSBjbGFzcyBmb3Igc3RvcmluZyB3aWRnZXQgdHJhY2tpbmcgZGF0YS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIFdpZGdldE1vZGVsID0gcmVxdWlyZSgnLi4vLi4vTW9kZWxzL1dpZGdldE1vZGVsJyksXG4gIFdpZGdldENvbGxlY3Rpb24gPSByZXF1aXJlKCcuLi8uLi9Db2xsZWN0aW9ucy9XaWRnZXRDb2xsZWN0aW9uJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIFdpZGdldFN0b3JlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge0VkaXRvckFkYXB0ZXJ9IGFkYXB0ZXJcbiAqICAgVGhlIGVkaXRvciBhZGFwdGVyIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHRpZSB0aGUgZWRpdG9yIHdpZGdldCBzdGF0ZSB0byB0aGVcbiAqICAgaW50ZXJuYWwgdHJhY2tlZCB3aWRnZXQgc3RhdGUuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYWRhcHRlcikge1xuICB0aGlzLl9hZGFwdGVyID0gYWRhcHRlcjtcbiAgdGhpcy5fdmlld3MgPSB7fTtcbiAgdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbiA9IG5ldyBXaWRnZXRDb2xsZWN0aW9uKCk7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuXG4gIC8qKlxuICAgKiBBZGRzIGEgbW9kZWwgdG8gdGhlIHdpZGdldCBzdG9yZS5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHdpZGdldE1vZGVsXG4gICAqICAgVGhlIHdpZGdldCBtb2RlbCB0byBiZSB0cmFja2VkLCBvciBhbiBhdHRyaWJ1dGVzIG9iamVjdCB0byB1cGRhdGUgYW5cbiAgICogICBleGlzdGluZyBtb2RlbCB3aXRoLiBJZiBhbiBhdHRyaWJ1dGVzIG9iamVjdCBpcyBwcm92aWRlZCwgaXQgbXVzdCBoYXZlIGFuXG4gICAqICAgaWQgYXR0cmlidXRlIGFuZCB0aGUgbW9kZSBtdXN0IGFscmVhZHkgYmUgaW4gdGhlIHN0b3JlLiBPdGhlcndpc2UgYW5cbiAgICogICBlcnJvciB3aWxsIGJlIHRocm93bi4gSWYgYSBtb2RlbCBpcyBwcm92aWRlZCBhbmQgYmVsb25ncyB0byBhIGNvbGxlY3Rpb24sXG4gICAqICAgaXQgbXVzdCBiZWxvbmcgdG8gdGhlIHdpZGdldCBzdG9yZSBpbnN0YW5jZSBjb2xsZWN0aW9uLiBPdGhlcndpc2UgYW5cbiAgICogICBlcnJvciB3aWxsIGJlIHRocm93bi5cbiAgICogQHBhcmFtIHtCYWNrYm9uZS5WaWV3fSB3aWRnZXRWaWV3XG4gICAqICAgQW4gb3B0aW9uYWwgdmlldyBjb3JyZXNwb25kaW5nIHRvIHRoZSB3aWRnZXQncyBET00gZWxlbWVudCwgaWYgb25lXG4gICAqICAgZXhpc3RzLiBUaGlzIHdpbGwgYmUgdXNlZCB0byB0cmFjayB3aGV0aGVyIHRoZSB3aWRnZXQgaXMgcHJlc2VudCBpbiB0aGVcbiAgICogICBET00gYW5kIGlmIGl0IGdldHMgb3JwaGFuZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge1dpZGdldE1vZGVsfVxuICAgKiAgIFRoZSBhZGRlZCBtb2RlbC5cbiAgICovXG4gIGFkZDogZnVuY3Rpb24od2lkZ2V0TW9kZWwsIHdpZGdldFZpZXcpIHtcbiAgICBpZiAoISh3aWRnZXRNb2RlbCBpbnN0YW5jZW9mIEJhY2tib25lLk1vZGVsKSkge1xuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSB3aWRnZXRNb2RlbDtcbiAgICAgIHdpZGdldE1vZGVsID0gdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbi5nZXQoYXR0cmlidXRlcy5pZCk7XG4gICAgICBpZiAoIXdpZGdldE1vZGVsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQXR0ZW1wdCB0byB1cGRhdGUgYW4gdW5rbm93biB3aWRnZXQuJyk7XG4gICAgICB9XG4gICAgICB3aWRnZXRNb2RlbC5zZXQoYXR0cmlidXRlcyk7XG4gICAgfVxuXG4gICAgaWYgKHdpZGdldE1vZGVsLmNvbGxlY3Rpb24pIHtcbiAgICAgIGlmICh3aWRnZXRNb2RlbC5jb2xsZWN0aW9uICE9PSB0aGlzLl93aWRnZXRDb2xsZWN0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIHdpZGdldCBiZWluZyBhZGRlZCBhbHJlYWR5IGJlbG9uZ3MgdG8gYW5vdGhlciBlZGl0b3IuJyk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Ubyh3aWRnZXRNb2RlbCwgJ2Rlc3Ryb3knLCB0aGlzLl9yZW1vdmVXcmFwcGVyKTtcbiAgICAgIHRoaXMubGlzdGVuVG8od2lkZ2V0TW9kZWwsICdjaGFuZ2U6aXRlbUlkJywgdGhpcy5fdXBkYXRlSXRlbVJlZmVyZW5jZSk7XG4gICAgICB0aGlzLl93aWRnZXRDb2xsZWN0aW9uLmFkZCh3aWRnZXRNb2RlbCk7XG4gICAgfVxuXG4gICAgaWYgKHdpZGdldFZpZXcpIHtcbiAgICAgIHZhciBpID0gd2lkZ2V0TW9kZWwuZ2V0KCdpdGVtSWQnKTtcbiAgICAgIHZhciBqID0gd2lkZ2V0TW9kZWwuZ2V0KCdpZCcpO1xuICAgICAgaWYgKCF0aGlzLl92aWV3c1tpXSkge1xuICAgICAgICB0aGlzLl92aWV3c1tpXSA9IHt9O1xuICAgICAgfVxuICAgICAgdGhpcy5fdmlld3NbaV1bal0gPSB3aWRnZXRWaWV3O1xuICAgIH1cblxuICAgIHJldHVybiB3aWRnZXRNb2RlbDtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyBhIHdpZGdldCBtb2RlbCwgdmlldyBwYWlyIGJhc2VkIG9uIGl0cyB3aWRnZXQgaWQuXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdG8gZ2V0LlxuICAgKiBAcGFyYW0ge2Jvb2x9IG1vZGVsT25seVxuICAgKiAgIFNldCB0byB0cnVlIHRvIHNraXAgZWRpdG9yIHZpZXcgbG9va3VwLiBUaGlzIHNob3VsZCBiZSB1c2VkIGZvclxuICAgKiAgIHJlYWQtb25seSBhY2Nlc3MgdG8gdGhlIG1vZGVsIHNpbmNlIHRoaXMgbWV0aG9kIGhhcyB0aGUgc2lkZS1lZmZlY3Qgb2ZcbiAgICogICBjbGVhbmluZyB1cCB0aGUgcmVmZXJlbmNlIHRhYmxlIGlmIHRoZSB2aWV3IGlzIG5vdCBmb3VuZCBpbiB0aGUgRE9NLlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqICAgQW4gb2JqZWN0IHdpdGgga2V5cyAnbW9kZWwnIGFuZCAndmlldycsIHdoaWNoIGFyZSByZXNwZWN0aXZlbHkgdGhlIG1vZGVsXG4gICAqICAgYW5kIHZpZXcgb2JqZWN0cyBhc3NvY2lhdGVkIHdpdGggdGhlIHdpZGdldCBpZC4gSWYgZWl0aGVyIGNhbm5vdCBiZVxuICAgKiAgIGZvdW5kLCB0aGUgdmFsdWUgaW4gdGhlIHJlc3BlY3RpdmUga2V5IGlzIG51bGwuXG4gICAqL1xuICBnZXQ6IGZ1bmN0aW9uKGlkLCBtb2RlbE9ubHkpIHtcbiAgICB2YXIgd2lkZ2V0TW9kZWwgPSB0aGlzLl93aWRnZXRDb2xsZWN0aW9uLmdldChpZCk7XG4gICAgaWYgKHdpZGdldE1vZGVsICYmICFtb2RlbE9ubHkpIHtcbiAgICAgIHZhciBpID0gd2lkZ2V0TW9kZWwuZ2V0KCdpdGVtSWQnKTtcbiAgICAgIHZhciBqID0gd2lkZ2V0TW9kZWwuZ2V0KCdpZCcpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbW9kZWw6IHdpZGdldE1vZGVsLFxuICAgICAgICB2aWV3OiB0aGlzLl9yZWFkQ2VsbChpLCBqKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1vZGVsOiB3aWRnZXRNb2RlbCA/IHdpZGdldE1vZGVsIDogbnVsbCxcbiAgICAgIHZpZXc6IG51bGxcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgbW9kZWwgZnJvbSB0aGUgc3RvcmUuXG4gICAqXG4gICAqIElmIHRoZSB3aWRnZXQgaGFzIG5vdCBhbHJlYWR5IGJlZW4gbWFya2VkIGFzIGRlc3Ryb3llZCBieSB0aGUgZWRpdG9yLCB0aGlzXG4gICAqIG1ldGhvZCB3aWxsIGFsc28gdHJpZ2dlciB3aWRnZXQgZGVzdHJ1Y3Rpb24gd2l0aGluIHRoZSBlZGl0b3IgdGhyb3VnaCB0aGVcbiAgICogZWRpdG9yIGFkYXB0ZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7V2lkZ2V0TW9kZWx9IHdpZGdldE1vZGVsXG4gICAqICAgVGhlIHdpZGdldCBtb2RlbCB0byBiZSByZW1vdmVkIGZyb20gdGhlIHN0b3JlLlxuICAgKiBAcGFyYW0ge2Jvb2x9IHNraXBEZXN0cm95XG4gICAqICAgQWxsb3dzIHRoZSBjbGllbnQgdG8gc3RvcCB0cmFja2luZyBhIHdpZGdldCB3aXRob3V0IGFjdHVhbGx5IHRyaWdnZXJpbmdcbiAgICogICB0aGUgZGVzdHJ1Y3Rpb24gb2YgdGhhdCB3aWRnZXQgd2l0aGluIHRoZSBlZGl0b3IuIFBhc3MgdHJ1ZSB0byBhdm9pZFxuICAgKiAgIGRlc3Ryb3lpbmcgdGhlIGVkaXRvciB3aWRnZXQuIEJ5IGRlZmF1bHQsIGNhbGxpbmcgdGhpcyBtZXRob2Qgd2lsbFxuICAgKiAgIHRyaWdnZXIgd2lkZ2V0IGRlc3RydWN0aW9uIHdpdGhpbiB0aGUgZWRpdG9yIGlmIGl0IGhhcyBub3QgYWxyZWFkeSBiZWVuXG4gICAqICAgZGVzdHJveWVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRNb2RlbH1cbiAgICogICBUaGUgd2lkZ2V0IG1vZGVsIHRoYXQgd2FzIGRlc3Ryb3llZC5cbiAgICovXG4gIHJlbW92ZTogZnVuY3Rpb24od2lkZ2V0TW9kZWwsIHNraXBEZXN0cm95KSB7XG4gICAgaWYgKCF3aWRnZXRNb2RlbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpID0gd2lkZ2V0TW9kZWwuZ2V0KCdpdGVtSWQnKTtcbiAgICB2YXIgaiA9IHdpZGdldE1vZGVsLmdldCgnaWQnKTtcblxuICAgIC8vIElmIHRoZSB3aWRnZXQgaGFzIG5vdCBhbHJlYWR5IGJlZW4gZGVzdHJveWVkIHdpdGhpbiB0aGUgZWRpdG9yLCB0aGVuXG4gICAgLy8gcmVtb3ZpbmcgaXQgaGVyZSB0cmlnZ2VycyBpdHMgZGVzdHJ1Y3Rpb24uIFdlIHByb3ZpZGUgdGhlIGNhbGxlciB0aGVcbiAgICAvLyBhYmlsaXR5IHRvIHNpZGVzdGVwIHRoaXMgc2lkZSBlZmZlY3Qgd2l0aCB0aGUgc2tpcERlc3Ryb3kgb3B0LW91dC5cbiAgICBpZiAoIXdpZGdldE1vZGVsLmhhc1N0YXRlKFdpZGdldE1vZGVsLlN0YXRlLkRFU1RST1lFRF9XSURHRVQpICYmICFza2lwRGVzdHJveSkge1xuICAgICAgdGhpcy5fYWRhcHRlci5kZXN0cm95V2lkZ2V0KHdpZGdldE1vZGVsLmdldCgnaWQnKSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgaXMgY3VycmVudGx5IGEgdmlldyBhc3NvY2FpdGVkIHdpdGggdGhlIHdpZGdldCwgdGhlbiBkZXN0cm95IGl0LlxuICAgIGlmICh0aGlzLl92aWV3c1tpXSAmJiB0aGlzLl92aWV3c1tpXVtqXSkge1xuICAgICAgdmFyIHZpZXcgPSB0aGlzLl92aWV3c1tpXVtqXTtcbiAgICAgIGRlbGV0ZSB0aGlzLl92aWV3c1tpXVtqXTtcbiAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHRoZSB3aWRnZXQgZnJvbSB0aGUgaW50ZXJuYWwgY29sbGVjdGlvbiwgcGVyZm9ybSBtZW1vcnkgY2xlYW51cCxcbiAgICAvLyBhbmQgbWFyayB0aGUgd2lkZ2V0IG1vZGVsIGFzIG5vIGxvbmdlciBiZWluZyB0cmFja2VkLlxuICAgIHRoaXMuX2NsZWFuUm93KGkpO1xuICAgIHRoaXMuX3dpZGdldENvbGxlY3Rpb24ucmVtb3ZlKHdpZGdldE1vZGVsKTtcbiAgICB3aWRnZXRNb2RlbC5zZXRTdGF0ZShXaWRnZXRNb2RlbC5TdGF0ZS5ERVNUUk9ZRURfUkVGUyk7XG5cbiAgICByZXR1cm4gd2lkZ2V0TW9kZWw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvdW50cyB0aGUgbnVtYmVyIG9mIGRpZmZlcmVudCB3aWRnZXRzIHRoYXQgcmVmZXJlbmNlIHRoZSBzYW1lIGJ1ZmZlciBpdGVtLlxuICAgKlxuICAgKiBAcGFyYW0ge1dpZGdldE1vZGVsfSB3aWRnZXRNb2RlbFxuICAgKiAgIEEgd2lkZ2V0IG1vZGVsIHRvIGNvdW50IHRoZSBidWZmZXIgaXRlbSByZWZlcmVuY2VzIGZvci4gVGhpcyBmdW5jdGlvblxuICAgKiAgIHdpbGwgcmV0dXJuIHRoZSB0b3RhbCBudW1iZXIgb2Ygd2lkZ2V0cyB0aGF0IHJlZmVyZW5jZSB0aGUgYnVmZmVyIGl0ZW1cbiAgICogICBnaXZlbiBieSB0aGUgaXRlbUlkIGF0dHJpYnV0ZSBvbiB0aGUgd2lkZ2V0IG1vZGVsLCBpbmNsdWRpbmcgdGhlIHBhc3NlZFxuICAgKiAgIHdpZGdldCBpdGVzZWxmLlxuICAgKlxuICAgKiBAcmV0dXJuIHtpbnR9XG4gICAqICAgVGhlIG51bWJlciBvZiB3aWRnZXRzIHJlZmVyZW5jaW5nIHRoZSBpdGVtIHNwZWNpZmllZCBieSB0aGUgcGFzc2VkIHdpZGdldFxuICAgKiAgIG1vZGVsJ3MgcmVmZXJlbmNlZCBpdGVtLlxuICAgKi9cbiAgY291bnQ6IGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgdmFyIGNvdW50ID0gMDtcblxuICAgIGlmICh3aWRnZXRNb2RlbCkge1xuICAgICAgdmFyIGkgPSB3aWRnZXRNb2RlbC5nZXQoJ2l0ZW1JZCcpO1xuICAgICAgZm9yICh2YXIgaiBpbiB0aGlzLl92aWV3c1tpXSkge1xuICAgICAgICBpZiAodGhpcy5fcmVhZENlbGwoaSwgaikpIHtcbiAgICAgICAgICBjb3VudCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvdW50O1xuICB9LFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyB0aGUgZGVzdHJ1Y3Rpb24gb2YgYWxsIHRyYWNrZWQgd2lkZ2V0cyBhbmQgZGF0YSBzdHJ1Y3R1cmVzLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIGNsZWFudXA6IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5fdmlld3MpIHtcbiAgICAgIGZvciAodmFyIGogaW4gdGhpcy5fdmlld3NbaV0pIHtcbiAgICAgICAgdGhpcy5fdmlld3NbaV1bal0ucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICBkZWxldGUgdGhpcy5fdmlld3NbaV07XG4gICAgfVxuICAgIHRoaXMuX3dpZGdldENvbGxlY3Rpb24ucmVzZXQoKTtcbiAgICB0aGlzLl9hZGFwdGVyLmNsZWFudXAoKTtcbiAgICByZXR1cm4gdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNhZmVseSByZXRyaWV2ZXMgYSB2aWV3IGZyb20gdGhlIHRhYmxlIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaVxuICAgKiAgIFRoZSByb3cgKGJ1ZmZlciBpdGVtIGlkKSBpbiB0aGUgdmlldyB0YWJsZSB0byByZWFkIGZyb20uXG4gICAqIEBwYXJhbSB7aW50fSBqXG4gICAqICAgVGhlIGNvbHVtbiAod2lkZ2V0IGlkKSBpbiB0aGUgdmlldyB0YWJsZSB0byByZWFkIGZyb20uXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLlZpZXd9XG4gICAqICAgQSB2aWV3IG9iamVjdCBpZiBvbmUgZXhpc3RzIGluIHRoZSB2aWV3IHRhYmxlIGl0IChpLGopLCBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIF9yZWFkQ2VsbDogZnVuY3Rpb24oaSwgaikge1xuICAgIHZhciB2aWV3ID0gbnVsbDtcblxuICAgIGlmICh0aGlzLl92aWV3c1tpXSAmJiB0aGlzLl92aWV3c1tpXVtqXSkge1xuICAgICAgdmlldyA9IHRoaXMuX3ZpZXdzW2ldW2pdO1xuICAgICAgaWYgKCF0aGlzLl9hZGFwdGVyLmdldFJvb3RFbCgpLmNvbnRhaW5zKHZpZXcuZWwpKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKHZpZXcubW9kZWwpO1xuICAgICAgICB2aWV3ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmlldztcbiAgfSxcblxuICAvKipcbiAgICogUmVjbGFpbXMgc3BhY2UgZnJvbSBhbiB1bnVzZWQgcm93LlxuICAgKlxuICAgKiBUaGlzIGlzIGNhbGxlZCBhZnRlciBwZXJmb3JtaW5nIGVudHJ5IHJlbW92YWxzIHRvIGRlbGV0ZSByb3dzIGluIHRoZSB2aWV3XG4gICAqIHRhYmxlIG9uY2UgdGhleSBiZWNvbWUgZW1wdHkuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpXG4gICAqICAgVGhlIHJvdyBpbiB0aGUgdmlldyB0YWJsZSB0byBjaGVjayBmb3IgY2xlYW51cC4gSWYgdGhpcyByb3cgaXMgZW1wdHksIGl0XG4gICAqICAgd2lsbCBiZSByZW1vdmVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX2NsZWFuUm93OiBmdW5jdGlvbihpKSB7XG4gICAgaWYgKHRoaXMuX3ZpZXdzW2ldICYmIF8uaXNFbXB0eSh0aGlzLl92aWV3c1tpXSkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl92aWV3c1tpXTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHdpZGdldCB0YWJsZSB3aGVuIGEgd2lkZ2V0J3MgcmVmZXJlbmNlZCBpdGVtIGhhcyBjaGFuZ2VkLlxuICAgKlxuICAgKiBUaGlzIGVuc3VyZXMgdGhhdCB3aGVuIGEgYnVmZmVyIGl0ZW0gaXMgZHVwbGljYXRlZCBmb3IgYSB3aWRnZXQsIGFuZCB0aGVcbiAgICogd2lkZ2V0IGdldHMgdXBkYXRlZCB0byBwb2ludCB0byB0aGUgbmV3IGl0ZW0sIHRoZSB2aWV3IHRhYmxlIGlzIHVwZGF0ZWQgdG9cbiAgICogcmVmbGVjdCB0aGUgY2hhbmdlLiBJbiBwYXJ0aWN1bGFyIHRoaXMgbWVhbnMgbW92aW5nIHRoZSBkYXRhIGZyb20gdGhlIG9sZFxuICAgKiB0YWJsZSBlbnRyeSB0byB0aGUgbmV3IHRhYmxlIGVudHJ5LlxuICAgKlxuICAgKiBAcGFyYW0ge1dpZGdldE1vZGVsfSB3aWRnZXRNb2RlbFxuICAgKiAgIFRoZSB3aWRnZXQgbW9kZWwgdGhhdCBoYXMgaGFkIGl0cyBpdGVtSWQgYXR0cmlidXRlIHVwZGF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBfdXBkYXRlSXRlbVJlZmVyZW5jZTogZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICB2YXIgaSA9IHdpZGdldE1vZGVsLnByZXZpb3VzKCdpdGVtSWQnKTtcbiAgICB2YXIgaiA9IHdpZGdldE1vZGVsLmdldCgnaWQnKTtcbiAgICB2YXIgayA9IHdpZGdldE1vZGVsLmdldCgnaXRlbUlkJyk7XG5cbiAgICBpZiAodGhpcy5fdmlld3NbaV0gJiYgdGhpcy5fdmlld3NbaV1bal0pIHtcbiAgICAgIGlmICghdGhpcy5fdmlld3Nba10pIHtcbiAgICAgICAgdGhpcy5fdmlld3Nba10gPSB7fTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3ZpZXdzW2tdW2pdID0gdGhpcy5fdmlld3NbaV1bal07XG4gICAgICBkZWxldGUgdGhpcy5fdmlld3NbaV1bal07XG4gICAgfVxuXG4gICAgdGhpcy5fY2xlYW5Sb3coaSk7XG4gIH0sXG5cbiAgX3JlbW92ZVdyYXBwZXI6IGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgdGhpcy5yZW1vdmUod2lkZ2V0TW9kZWwpO1xuICB9XG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGEgY2xhc3MgZm9yIGdlbmVyYXRpbmcgd2lkZ2V0IHZpZXdzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIFdpZGdldFZpZXdGYWN0b3J5IG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnRGYWN0b3J5fSBlbGVtZW50RmFjdG9yeVxuICogICBUaGUgZWxlbWVudCBmYWN0b3J5IHRoYXQgd2lsbCBiZSBpbmplY3RlZCBpbnRvIGNyZWF0ZWQgdmlld3MuXG4gKiBAcGFyYW0ge0VkaXRvckFkYXB0ZXJ9IGFkYXB0ZXJcbiAqICAgVGhlIGVkaXRvciBhZGFwdGVyIHRoYXQgd2lsbCBiZSBpbmplY3RlZCBpbnRvIGNyZWF0ZWQgdmlld3MuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIGFkYXB0ZXIpIHtcbiAgdGhpcy5fZWxlbWVudEZhY3RvcnkgPSBlbGVtZW50RmFjdG9yeTtcbiAgdGhpcy5fYWRhcHRlciA9IGFkYXB0ZXI7XG4gIHRoaXMuX3ZpZXdNb2RlcyA9IFtdO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIHZpZXcgbW9kZS5cbiAgICpcbiAgICogVmlldyBtb2RlcyBjb3JyZXNwb25kIHRvIHNwZWNpZmljIHZpZXcgcHJvdG90eXBlcy4gVGhpcyBhbGxvd3Mgd2lkZ2V0cyB0b1xuICAgKiBiZSBkaXNwbGF5ZWQgaW4gZGlmZmVyZW50IGZvcm1zLiBGb3IgdGhlIHB1cnBvc2VzIG9mIHRoZSB3aWRnZXQtc3luY1xuICAgKiBsaWJyYXJ5LCB0aGlzIGdlbmVyYWxseSBtZWFucyB3ZSBoYXZlIG9uZSAnZWRpdG9yJyB2aWV3IG1vZGUgdGhhdCB0aGUgdXNlclxuICAgKiB3aWxsIGludGVyYWN0IHdpdGggaW4gdGhlIHd5c2l3eWcsIGFuZCBvbmUgb3IgbW9yZSAnZXhwb3J0JyB2aWV3IG1vZGUocylcbiAgICogdGhhdCB3aWxsIGJlIHVzZWQgdG8gdHJhbnNmb3JtIHVzZXIgaW5wdXQgaW50byBhIGZvcm1hdCB0aGF0IGlzIGVhc2llciB0b1xuICAgKiBzYXZlLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmlld01vZGVcbiAgICogICBUaGUgbmFtZSBvZiB0aGUgdmlldyBtb2RlIGJlaW5nIHJlZ2lzdGVyZWQuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAgICogICBUaGUgZGVmaW5pdGlvbiBvZiB0aGUgb2JqZWN0IGJlaW5nIHJlZ2lzdGVyZWQuIFNlZSBjb25maWcuanMgZm9yIGV4YW1wbGVzXG4gICAqICAgb2YgdGhlIGZvcm1hdCBvZiB0aGlzIG9iamVjdC4gQXQgbWluaW11bSwgZWFjaCBkZWZpbml0aW9uIG5lZWRzIGFcbiAgICogICAncHJvdG90eXBlJyBrZXkgdGhhdCBpcyBhIEJhY2tib25lLlZpZXcgZGVzY2VuZGVkIHR5cGUuXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICogICBUaGUgcGFzc2VkIGRlZml0aW9uIGlmIG5vIGVycm9ycyBvY2N1cnJlZC5cbiAgICovXG4gIHJlZ2lzdGVyOiBmdW5jdGlvbih2aWV3TW9kZSwgZGVmKSB7XG4gICAgaWYgKCFkZWYgfHwgIWRlZi5wcm90b3R5cGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVmlldyBtb2RlIHJlcXVpcmVzIGEgdmlldyBwcm90b3R5cGUuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3ZpZXdNb2Rlc1t2aWV3TW9kZV0gPSBkZWY7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSB2aWV3IGZvciBhIHdpZGdldCBtb2RlbC5cbiAgICpcbiAgICogQHBhcmFtIHtXaWRnZXRNb2RlbH0gd2lkZ2V0TW9kZWxcbiAgICogICBUaGUgd2lkZ2V0IG1vZGVsIHRvIGNyZWF0ZSB0aGUgdmlldyBmb3IuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxcbiAgICogICBBIGpRdWVyeSB3cmFwcGVkIGVsZW1lbnQgZm9yIHRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB0aGUgcm9vdCBvZiB0aGVcbiAgICogICB2aWV3LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmlld01vZGVcbiAgICogICBUaGUgdmlldyBtb2RlIHRvIGNyZWF0ZSBmb3IgdGhlIHdpZGdldC4gVGhpcyB3aWxsIGJlIHVzZWQgdG8gZGV0ZXJtaW5lXG4gICAqICAgd2hpY2ggdmlldyBwcm90b3R5cGUgaXMgdXNlZCB0byBpbnN0YW50aWF0ZSB0aGUgdmlldy4gdmlld01vZGUgbXVzdCBoYXZlXG4gICAqICAgcHJldmlvdXNseSBiZWVuIHJlZ2lzdGVyZWQgdGhyb3VnaCB0aGUgcmVnaXN0ZXIgbWV0aG9kLlxuICAgKlxuICAgKiBAcmV0dXJuIHtCYWNrYm9uZS5WaWV3fVxuICAgKiAgIFRoZSBuZXdseSBjcmVhdGVkIHZpZXcgb2JqZWN0LlxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbih3aWRnZXRNb2RlbCwgJGVsLCB2aWV3TW9kZSkge1xuICAgIGlmICghdmlld01vZGUpIHtcbiAgICAgIHZpZXdNb2RlID0gd2lkZ2V0TW9kZWwuZ2V0KCd2aWV3TW9kZScpO1xuICAgIH1cblxuICAgIHZhciBkZWYgPSB0aGlzLl92aWV3TW9kZXNbdmlld01vZGVdO1xuICAgIGlmICghZGVmKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdmlldyBtb2RlIFwiJyArIHZpZXdNb2RlICsgJ1wiJyk7XG4gICAgfVxuXG4gICAgdmFyIG9wdGlvbnMgPSBkZWYub3B0aW9ucyA/IGRlZi5vcHRpb25zIDoge307XG5cbiAgICByZXR1cm4gbmV3IGRlZi5wcm90b3R5cGUoXy5leHRlbmQoe1xuICAgICAgbW9kZWw6IHdpZGdldE1vZGVsLFxuICAgICAgYWRhcHRlcjogdGhpcy5fYWRhcHRlcixcbiAgICAgIGVsZW1lbnRGYWN0b3J5OiB0aGlzLl9lbGVtZW50RmFjdG9yeSxcbiAgICAgIGVsOiAkZWwuZ2V0KDApLFxuICAgIH0sIG9wdGlvbnMpKTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHZpZXcgZm9yIGEgd2lkZ2V0IG1vZGVsLCBhbmQgYmxvY2tzIGl0cyBldmVudCBoYW5kbGVycy5cbiAgICpcbiAgICogQnkgZGVmYXVsdCwgdmlld3MgYXJlIGNyZWF0ZWQgd2l0aCBhIGxvbmctdGVybSBsaWZlY3ljbGUgaW4gbWluZC4gVGhleVxuICAgKiBhdHRhY2ggdGhlbXNlbHZlcyB0byB0aGUgRE9NLCBsaXN0ZW4gZm9yIGNoYW5nZXMgdG8gdGhlIG1vZGVsLCBhbmQgdXBkYXRlXG4gICAqIHRoZSBET00uXG4gICAqXG4gICAqIEluIGNlcnRhaW4gY2FzZXMsIHdlIGRlc2lyZSB0byBjcmVhdGUgYSB2aWV3IHNpbXBseSB0byB1c2UgaXRzIG1hcmt1cFxuICAgKiBwcm9jZXNzaW5nIGxvZ2ljLiBXZSBkbyB0aGlzIGluIG9yZGVyIHRvIHRyYW5zZm9ybSBtYXJrdXAgaW50byBhcHBsaWNhdGlvblxuICAgKiBzdGF0ZS5cbiAgICpcbiAgICogSWYgd2Ugc2ltcGx5IHVzZSB0aGUgY3JlYXRlIG1ldGhvZCBpbiB0aGlzIGNhc2UsIHZpZXdzIGNhbiBwcmV2ZW50XG4gICAqIHRoZW1zZWx2ZXMgZnJvbSBiZWluZyBkZXN0cm95ZWQsIGFuZCBjYW4gY2F1c2UgdW53YW50ZWQgc2lkZS1lZmZlY3RzIGJ5XG4gICAqIGF0dGFjaGluZyB0aGVpciBvd24gbm90aWZpY2F0aW9uIGhhbmRsZXJzIHRvIHRoZSBtb2RlbC4gVG8gcHJldmVudCB0aGlzLCBcbiAgICogd2UgdXNlIHRoaXMgbWV0aG9kIHRvIGNyZWF0ZSBhIHNob3J0LXRlcm0gbGlmZWN5Y2xlIHZpZXcgdGhhdCBjYW4gYmVcbiAgICogZGlzY2FyZGVkIHdpdGhvdXQgc2lkZS1lZmZlY3RzLlxuICAgKlxuICAgKiBAcGFyYW0ge1dpZGdldE1vZGVsfSB3aWRnZXRNb2RlbFxuICAgKiAgIFRoZSB3aWRnZXQgbW9kZWwgdG8gY3JlYXRlIHRoZSB2aWV3IGZvci5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbFxuICAgKiAgIEEgalF1ZXJ5IHdyYXBwZWQgZWxlbWVudCBmb3IgdGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHRoZSByb290IG9mIHRoZVxuICAgKiAgIHZpZXcuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2aWV3TW9kZVxuICAgKiAgIFRoZSB2aWV3IG1vZGUgdG8gY3JlYXRlIGZvciB0aGUgd2lkZ2V0LiBUaGlzIHdpbGwgYmUgdXNlZCB0byBkZXRlcm1pbmVcbiAgICogICB3aGljaCB2aWV3IHByb3RvdHlwZSBpcyB1c2VkIHRvIGluc3RhbnRpYXRlIHRoZSB2aWV3LiB2aWV3TW9kZSBtdXN0IGhhdmVcbiAgICogICBwcmV2aW91c2x5IGJlZW4gcmVnaXN0ZXJlZCB0aHJvdWdoIHRoZSByZWdpc3RlciBtZXRob2QuXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLlZpZXd9XG4gICAqICAgVGhlIG5ld2x5IGNyZWF0ZWQgdmlldyBvYmplY3QsIHdpdGggYWxsIGxpc3RlbmVycyByZW1vdmVkLlxuICAgKi9cbiAgY3JlYXRlVGVtcG9yYXJ5OiBmdW5jdGlvbih3aWRnZXRNb2RlbCwgJGVsLCB2aWV3TW9kZSkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZSh3aWRnZXRNb2RlbCwgJGVsLCB2aWV3TW9kZSkuc3RvcExpc3RlbmluZygpO1xuICB9XG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgdGhlIGxvZ2ljIGZvciBleGVjdXRpbmcgY29tbWFuZHMgZnJvbSB0aGUgcXVldWUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBBYnN0cmFjdCByZXByZXNlbnRhdGlvbiBvZiBhbiBIVE1MIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ1xuICogICBUaGUgaHRtbCB0YWcgbmFtZSBvZiB0aGUgZWxlbWVudC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBhdHRyaWJ1dGVNYXBcbiAqICAgQSBtYXBwaW5nIG9mIGF0dHJpYnV0ZXMgZm9yIHRoZSBlbGVtZW50LiBLZXlzIGFyZSBhdHRyaWJ1dGUgbmFtZXMgYW5kXG4gKiAgIHZhbHVlcyBhcmUgZWl0aGVyIGhhcmQtY29kZWQgYXR0cmlidXRlIHZhbHVlcyBvciBkYXRhIHJlZmVyZW5jZXMgaW4gdGhlXG4gKiAgIGZvciAnPGRhdGFrZXluYW1lPicuXG4gKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3JcbiAqICAgQSBzZWxlY3RvciBmb3IgZmluZGluZyBlbGVtZW50cyBvZiB0aGlzIHR5cGUuXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YVxuICogICBEYXRhIHRvIGFzc29jaWF0ZSB3aXRoIGVhY2ggYXR0cmlidXRlIGluIHRoZSBhdHRyaWJ1dGUgbWFwLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhZywgYXR0cmlidXRlTWFwLCBzZWxlY3RvciwgZGF0YSkge1xuICB2YXIgZWxlbWVudCA9IHRoaXM7XG5cbiAgaWYgKCFhdHRyaWJ1dGVNYXApIHtcbiAgICBhdHRyaWJ1dGVNYXAgPSB7fTtcbiAgfVxuXG4gIHRoaXMuX3RhZyA9IHRhZztcbiAgdGhpcy5fYXR0cmlidXRlTWFwID0gYXR0cmlidXRlTWFwO1xuICB0aGlzLl9zZWxlY3RvciA9IHNlbGVjdG9yO1xuICB0aGlzLl9pbnZlcnRlZEF0dHJpYnV0ZU1hcCA9IHt9O1xuICBfLmVhY2goYXR0cmlidXRlTWFwLCBmdW5jdGlvbihhdHRyaWJ1dGVfdmFsdWUsIGF0dHJpYnV0ZV9uYW1lKSB7XG4gICAgZWxlbWVudC5faW52ZXJ0ZWRBdHRyaWJ1dGVNYXBbZWxlbWVudC5fZ2V0RGF0YUtleShhdHRyaWJ1dGVfdmFsdWUpXSA9IGF0dHJpYnV0ZV9uYW1lO1xuICB9KTtcblxuICBpZiAoIWRhdGEpIHtcbiAgICBkYXRhID0ge307XG4gIH1cblxuICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuICBfLmVhY2goYXR0cmlidXRlTWFwLCBmdW5jdGlvbihhdHRyaWJ1dGVfdmFsdWUsIGF0dHJpYnV0ZV9uYW1lKSB7XG4gICAgdmFyIGRhdGFLZXkgPSBlbGVtZW50Ll9nZXREYXRhS2V5KGF0dHJpYnV0ZV92YWx1ZSk7XG4gICAgaWYgKGRhdGFLZXkpIHtcbiAgICAgIGlmIChkYXRhW2RhdGFLZXldKSB7XG4gICAgICAgIGF0dHJpYnV0ZXNbYXR0cmlidXRlX25hbWVdID0gZGF0YVtkYXRhS2V5XTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV9uYW1lXSA9IGF0dHJpYnV0ZV92YWx1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIHRoaXMuX2F0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGh0bWwgdGFnIG5hbWUgb2YgdGhlIGVsZW1lbnQuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICogICBUaGUgaHRtbCB0YWcgbmFtZS5cbiAgICovXG4gIGdldFRhZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhZztcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgYXR0cmlidXRlcyBvZiB0aGUgZWxlbWVudC5cbiAgICpcbiAgICogQHJldHVybiB7b2JqZWN0fVxuICAgKiAgIEEgbWFwIHdoZXJlIGtleXMgYXJlIGF0dHJpYnV0ZSBuYW1lcyBhbmQgdmFsdWVzIGFyZSB0aGUgYXNzb2NpYXRlZFxuICAgKiAgIGF0dHJpYnV0ZSB2YWx1ZXMuXG4gICAqL1xuICBnZXRBdHRyaWJ1dGVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fYXR0cmlidXRlcztcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgbmFtZXMgb2YgdGhlIGF0dHJpYnV0ZXMgdGhpcyBlbGVtZW50IHN1cHBvcnRzLlxuICAgKlxuICAgKiBAcmV0dXJuIHthcnJheX1cbiAgICogICBBbiBhcnJheSBvZiBhdHRyaWJ1dGUgbmFtZXMuXG4gICAqL1xuICBnZXRBdHRyaWJ1dGVOYW1lczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8ua2V5cyh0aGlzLl9hdHRyaWJ1dGVNYXApO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqICAgRWl0aGVyIGEgaGFyZCBjb2RlZCBhdHRyaWJ1dGUgbmFtZSBvciBhIGRhdGEgcmVmZXJlbmNlIG5hbWUgaWYgdGhlIGZvcm1cbiAgICogICAnPGRhdGFrZXluYW1lPicuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICAgKiAgIFRoZSBhdHRyaWJ1dGUgdmFsdWUuIE5vdGUgdGhhdCBvbmx5IHN0cmluZ3MgYXJlIHN1cHBvcnRlZCBoZXJlLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIHNldEF0dHJpYnV0ZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLl9hdHRyaWJ1dGVzW3RoaXMuZ2V0QXR0cmlidXRlTmFtZShuYW1lKV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgdmFsdWUgb2YgYW4gYXR0cmlidXRlIG9uIHRoaXMgZWxlbWVudCBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogICBFaXRoZXIgYSBoYXJkIGNvZGVkIGF0dHJpYnV0ZSBuYW1lIG9yIGEgZGF0YSByZWZlcmVuY2UgbmFtZSBpZiB0aGUgZm9ybVxuICAgKiAgICc8ZGF0YWtleW5hbWU+Jy5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKiAgIFRoZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIHRoZSByZXF1ZXN0ZWQgYXR0cmlidXRlLlxuICAgKi9cbiAgZ2V0QXR0cmlidXRlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX2F0dHJpYnV0ZXNbdGhpcy5nZXRBdHRyaWJ1dGVOYW1lKG5hbWUpXTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgbmFtZSBvZiBhbiBhdHRyaWJ1dGUgYmFzZWQgb24gaXRzIGRhdGEga2V5IGVudHJ5IG5hbWUuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqICAgQSBkYXRhIGtleSBlbnRyeSBuYW1lIGluIHRoZSBmb3JtICc8ZGF0YWtleW5hbWU+Jy5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKiAgIFRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUuIFBhc3NlcyB0aHJvdWdoIHRoZSBvcmlnaW5hbGx5IHBhc3NlZCBuYW1lXG4gICAqICAgaWYgbm8gZGF0YSBrZXkgbWF0Y2ggd2FzIGZvdW5kLlxuICAgKi9cbiAgZ2V0QXR0cmlidXRlTmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBkYXRhS2V5ID0gdGhpcy5fZ2V0RGF0YUtleShuYW1lKTtcbiAgICBpZiAoZGF0YUtleSAmJiB0aGlzLl9pbnZlcnRlZEF0dHJpYnV0ZU1hcFtkYXRhS2V5XSkge1xuICAgICAgbmFtZSA9IHRoaXMuX2ludmVydGVkQXR0cmlidXRlTWFwW2RhdGFLZXldO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZTtcbiAgfSxcblxuICAvKipcbiAgICogUmVuZGVycyB0aGUgb3BlbmluZyB0YWcgZm9yIHRoZSBlbGVtZW50LlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqICAgVGhlIHJlbmRlcmVkIG9wZW5pbmcgdGFnLlxuICAgKi9cbiAgcmVuZGVyT3BlbmluZ1RhZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3VsdCA9ICc8JyArIHRoaXMuZ2V0VGFnKCk7XG5cbiAgICBfLmVhY2godGhpcy5nZXRBdHRyaWJ1dGVzKCksIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICByZXN1bHQgKz0gJyAnICsgbmFtZSArICc9XCInICsgdmFsdWUgKyAnXCInO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArICc+JztcbiAgfSxcblxuICAvKipcbiAgICogUmVuZGVycyB0aGUgY2xvc2luZyB0YWcgZm9yIHRoZSBlbGVtZW50LlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqICAgVGhlIHJlbmRlcmVkIGNsb3NpbmcgdGFnLlxuICAgKi9cbiAgcmVuZGVyQ2xvc2luZ1RhZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICc8LycgKyB0aGlzLmdldFRhZygpICsgJz4nO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBzZWxlY3RvciBmb3IgZmluZGluZyBpbnN0YW5jZXMgb2YgdGhpcyBlbGVtZW50IGluIHRoZSBET00uXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICogICBUaGUgc2VsZWN0b3IgZm9yIHRoaXMgZWxlbWVudC5cbiAgICovXG4gIGdldFNlbGVjdG9yOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXR0cmlidXRlcyA9IHRoaXMuZ2V0QXR0cmlidXRlcygpO1xuICAgIHZhciBzZWxlY3RvciA9ICcnO1xuXG4gICAgaWYgKHRoaXMuX3NlbGVjdG9yKSB7XG4gICAgICBzZWxlY3RvciA9IHRoaXMuX3NlbGVjdG9yO1xuICAgIH1cbiAgICBlbHNlIGlmIChhdHRyaWJ1dGVzWydjbGFzcyddKSB7XG4gICAgICB2YXIgY2xhc3NlcyA9IGF0dHJpYnV0ZXNbJ2NsYXNzJ10uc3BsaXQoJyAnKTtcbiAgICAgIF8uZWFjaChjbGFzc2VzLCBmdW5jdGlvbihjbGFzc25hbWUpIHtcbiAgICAgICAgc2VsZWN0b3IgKz0gJy4nICsgY2xhc3NuYW1lO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc2VsZWN0b3IgPSB0aGlzLmdldFRhZygpO1xuICAgIH1cblxuICAgIHJldHVybiBzZWxlY3RvcjtcbiAgfSxcblxuICAvKipcbiAgICogSGVscGVyIGZ1bmN0aW9uIHRvIHBhcnNlIGRhdGEga2V5IGF0dHJpYnV0ZSBuYW1lcy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogICBUaGUgYXR0cmlidXRlIG5hbWUgdG8gYmUgcGFyc2VkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqICAgVGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBuYW1lICh3aXRob3V0IGVuY2xvc2luZyAnPD4nKSBpZiB0aGUgYXR0cmlidXRlXG4gICAqICAgbmFtZSBtYXRjaGVkIHRoZSBwYXR0ZXJuLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBfZ2V0RGF0YUtleTogZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciByZWdleCA9IC9ePChbYS16XFwtXSspPiQvO1xuICAgIHZhciBwYXJzZWQgPSByZWdleC5leGVjKG5hbWUpO1xuICAgIGlmIChwYXJzZWQgJiYgcGFyc2VkWzFdKSB7XG4gICAgICByZXR1cm4gcGFyc2VkWzFdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBjb21tYW5kcyBmcm9tIHRoZSBxdWV1ZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBFbGVtZW50ID0gcmVxdWlyZSgnLi9FbGVtZW50Jyk7XG5cbi8qKlxuICogQSBmYWN0b3J5IGZvciBjcmVhdGluZyBFbGVtZW50IG9iamVjdHMuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGVsZW1lbnRzXG4gKiAgIERlZmluaXRpb25zIG9mIGVsZW1lbnQgdHlwZXMgdGhhdCBjYW4gYmUgY3JlYXRlZCBieSB0aGlzIGZhY3RvcnkuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudHMpIHtcbiAgdGhpcy5fZWxlbWVudHMgPSBlbGVtZW50cztcblxuICBfLmVhY2godGhpcy5fZWxlbWVudHMsIGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICBpZiAoIWVsZW1lbnQuYXR0cmlidXRlcykge1xuICAgICAgZWxlbWVudC5hdHRyaWJ1dGVzID0ge307XG4gICAgfVxuICB9KTtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVsZW1lbnQgb2JqZWN0IHdpdGggbm8gZGF0YS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogICBUaGUgdHlwZSBvZiBlbGVtZW50IHRvIGdldCBhIHRlbXBsYXRlIGZvci5cbiAgICpcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICogICBUaGUgY3JlYXRlZCBlbGVtZW50IG9iamVjdCwgd2l0aCBubyBhZGRpdGlvbmFsIGRhdGEuXG4gICAqL1xuICBnZXRUZW1wbGF0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZShuYW1lKTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBlbGVtZW50IGluc3RhbmNlIHdpdGggc3BlY2lmaWMgZGF0YSBhdHRyaWJ1dGVzLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiAgIFRoZSB0eXBlIG9mIGVsZW1lbnQgdG8gY3JlYXRlZCBhcyBkZWZpbmVkIGluIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGFcbiAgICogICBUaGUgZGF0YSB0byB1c2UgdG8gZmlsbCBpbiB0aGUgZWxlbWVudCBhdHRyaWJ1dGVzIGJhc2VkIG9uIHRoZSB0eXBlXG4gICAqICAgZGVmaW5pdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICogICBUaGUgY3JlYXRlZCBlbGVtZW50IG9iamVjdCwgd2l0aCB0aGUgcGFzc2VkIGF0dHJpYnV0ZSBkYXRhIGZpbGxlZCBpbi5cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24obmFtZSwgZGF0YSkge1xuICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMuX2VsZW1lbnRzW25hbWVdO1xuICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBlbGVtZW50IHR5cGUuJyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgRWxlbWVudCh0ZW1wbGF0ZS50YWcsIHRlbXBsYXRlLmF0dHJpYnV0ZXMsIHRlbXBsYXRlLnNlbGVjdG9yLCBkYXRhKTtcbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGEgbW9kZWwgZm9yIHJlcHJlc2VudGluZyBhIGNvbnRleHQuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICBFZGl0QnVmZmVySXRlbUNvbGxlY3Rpb24gPSByZXF1aXJlKCcuLi9Db2xsZWN0aW9ucy9FZGl0QnVmZmVySXRlbUNvbGxlY3Rpb24nKTtcblxuLyoqXG4gKiBCYWNrYm9uZSBNb2RlbCBmb3IgcmVwcmVzZW50aW5nIGVkaXRvciB3aWRnZXQgY29udGV4dHMuXG4gKlxuICogQSBjb250ZXh0IGlzIGFuIGVudmlyb25tZW50IHdoZXJlIHdpZGdldHMgY2FuIGFwcGVhci4gQ29udGV4dHMgbGV0IHVzIGtub3dcbiAqIHdobyBvd25zIHRoZSBkYXRhIGl0J3MgYXNzb2NpYXRlZCB3aXRoLiBFYWNoIGVkaXRhYmxlIHJlZ2lvbiB3aWxsIGdldCBpdHNcbiAqIG93biBjb250ZXh0LiBXaGVuIGEgd2lkZ2V0IHRyYXZlbHMgZnJvbSBvbmUgY29udGV4dCB0byBhbm90aGVyIGl0IGZsYWdzIHRoYXRcbiAqIHRoZSBkYXRhIGVudGl0eSB0aGF0IGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgd2lkZ2V0IG5lZWRzIHRvIGJlIHVwZGF0ZWQuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnQ29udGV4dCcsXG5cbiAgZGVmYXVsdHM6IHtcbiAgICBvd25lcklkOiAnJyxcbiAgICBmaWVsZElkOiAnJyxcbiAgICBzY2hlbWFJZDogJycsXG4gICAgc2V0dGluZ3M6IHt9LFxuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmVkaXRCdWZmZXIgPSBuZXcgRWRpdEJ1ZmZlckl0ZW1Db2xsZWN0aW9uKFtdLCB7IGNvbnRleHRJZDogYXR0cmlidXRlcy5pZCB9KTtcbiAgICBCYWNrYm9uZS5Nb2RlbC5hcHBseSh0aGlzLCBbYXR0cmlidXRlcywgb3B0aW9uc10pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgc2V0OiBmdW5jdGlvbihhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgaWYgKGF0dHJpYnV0ZXMuZWRpdEJ1ZmZlckl0ZW1zKSB7XG4gICAgICB0aGlzLmVkaXRCdWZmZXIuYWRkKGF0dHJpYnV0ZXMuZWRpdEJ1ZmZlckl0ZW1zLCB7bWVyZ2U6IHRydWV9KTtcbiAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzLmVkaXRCdWZmZXJJdGVtcztcbiAgICB9XG5cbiAgICB2YXIgb2xkSWQgPSB0aGlzLmdldCgnaWQnKTtcbiAgICB2YXIgbmV3SWQgPSBhdHRyaWJ1dGVzLmlkO1xuICAgIGlmIChuZXdJZCAmJiBvbGRJZCAmJiBuZXdJZCAhPSBvbGRJZCkge1xuICAgICAgdmFyIGNvbGxlY3Rpb24gPSB0aGlzLmNvbGxlY3Rpb247XG4gICAgICBpZiAoY29sbGVjdGlvbikge1xuICAgICAgICBjb2xsZWN0aW9uLnJlbW92ZSh0aGlzLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLmlkID0gdGhpcy5pZCA9IG5ld0lkO1xuICAgICAgICBjb2xsZWN0aW9uLmFkZCh0aGlzLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLmlkID0gdGhpcy5pZCA9IG9sZElkO1xuICAgICAgfVxuICAgIH1cblxuICAgIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgfSxcblxuICAvKipcbiAgICogQSBjb252ZW5pZW5jZSBmdW5jdGlvbiBmb3IgcmVhZGluZyBhbiBpbmRpdmlkdWFsIHNldHRpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAgICogICBUaGUgc2V0dGluZ3Mga2V5IHRvIGxvb2t1cC5cbiAgICpcbiAgICogQHJldHVybiB7bWl4ZWR9XG4gICAqICAgVGhlIHNldHRpbmcgdmFsdWUgdGhhdCB3YXMgcmVhZCBvciB1bmRlZmluZWQgaWYgbm8gc3VjaCBzZXR0aW5nIGV4aXN0ZWQuXG4gICAqL1xuICBnZXRTZXR0aW5nOiBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5nZXQoJ3NldHRpbmdzJylba2V5XTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIG1vZGVsIGZvciByZXByZXNlbnRpbmcgZWRpdCBidWZmZXIgaXRlbXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG4vKipcbiAqIEJhY2tib25lICBNb2RlbCBmb3IgcmVwcmVzZW50aW5nIGNvbW1hbmRzLlxuICpcbiAqIFRoZSBpZCBmb3IgdGhpcyBtb2RlbCBpcyB0aGUgdXVpZCBvZiBhIGRhdGEgZW50aXR5IHRoYXQgdGhlIGl0ZW1cbiAqIGNvcnJlc3BvbmRzIHRvLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBhdWdtZW50cyBCYWNrYm9uZS5Nb2RlbFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cbiAgdHlwZTogJ0VkaXRCdWZmZXJJdGVtJyxcblxuICAvKipcbiAgICogQHR5cGUge29iamVjdH1cbiAgICpcbiAgICogQHByb3AgbWFya3VwXG4gICAqL1xuICBkZWZhdWx0czoge1xuXG4gICAgJ2NvbnRleHRJZCc6ICcnLFxuXG4gICAgLyoqXG4gICAgICogV2hldGhlciBvciBub3QgdGhlIGl0ZW0gaXMgcmVhZHkgdG8gYmUgaW5zZXJ0ZWQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgICdpbnNlcnQnOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBpdGVtIG1hcmt1cC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgJ21hcmt1cCc6ICcuLi4nLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGl0ZW0gbWFya3VwLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICAndHlwZSc6ICcnLFxuXG4gICAgJ2ZpZWxkcyc6IHt9XG4gIH0sXG5cbn0pO1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cbiAgdHlwZTogJ0VkaXRvcicsXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbihhdHRyaWJ1dGVzLCBjb25maWcpIHtcbiAgICB0aGlzLndpZGdldEZhY3RvcnkgPSBjb25maWcud2lkZ2V0RmFjdG9yeTtcbiAgICB0aGlzLnZpZXdGYWN0b3J5ID0gY29uZmlnLnZpZXdGYWN0b3J5O1xuICAgIHRoaXMud2lkZ2V0U3RvcmUgPSBjb25maWcud2lkZ2V0U3RvcmU7XG4gICAgdGhpcy5lZGl0QnVmZmVyTWVkaWF0b3IgPSBjb25maWcuZWRpdEJ1ZmZlck1lZGlhdG9yO1xuICAgIHRoaXMuY29udGV4dCA9IGNvbmZpZy5jb250ZXh0O1xuICAgIHRoaXMuY29udGV4dFJlc29sdmVyID0gY29uZmlnLmNvbnRleHRSZXNvbHZlcjtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29udGV4dCwgJ2NoYW5nZTppZCcsIHRoaXMuX3VwZGF0ZUNvbnRleHRJZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICB0aGlzLndpZGdldFN0b3JlLmNsZWFudXAoKTtcbiAgICB0aGlzLmVkaXRCdWZmZXJNZWRpYXRvci5jbGVhbnVwKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoYW5nZSBoYW5kbGVyIGZvciBhIGNvbnRleHQgaWQgY2hhbmdlLlxuICAgKlxuICAgKiBAcGFyYW0ge0JhY2tib25lLk1vZGVsfSBjb250ZXh0TW9kZWxcbiAgICogICBUaGUgY29udGV4dCBtb2RlbCB0aGF0IGhhcyBoYWQgYW4gaWQgY2hhbmdlLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX3VwZGF0ZUNvbnRleHRJZDogZnVuY3Rpb24oY29udGV4dE1vZGVsKSB7XG4gICAgdGhpcy5zZXQoeyBpZDogY29udGV4dE1vZGVsLmdldCgnaWQnKSB9KTtcbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgbW9kZWwgZm9yIHJlcHJlc2VudGluZyBhIHNjaGVtYSBlbnRyeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICogQmFja2JvbmUgIE1vZGVsIGZvciByZXByZXNlbnRpbmcgYSBzY2hlbWEgZW50cnkuXG4gKlxuICogVGhlIGlkIGZvciB0aGlzIG1vZGVsIGlzIHRoZSB1dWlkIG9mIGEgZGF0YSBlbnRpdHkgdGhhdCB0aGUgaXRlbVxuICogY29ycmVzcG9uZHMgdG8uXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnU2NoZW1hJyxcblxuICAvKipcbiAgICogQHR5cGUge29iamVjdH1cbiAgICpcbiAgICogQHByb3AgbWFya3VwXG4gICAqL1xuICBkZWZhdWx0czoge1xuXG4gICAgJ2FsbG93ZWQnOiB7fSxcbiAgfSxcblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyBpZiBhIHR5cGUgaXMgYWxsb3dlZCB3aXRoaW4gYSBzY2hlbWEuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgVGhlIHR5cGUgdG8gdGVzdCB2YWxpZGl0eSBmb3IuXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2x9XG4gICAqICAgVHJ1ZSBpZiB0aGUgdHlwZSBpcyBhbGxvd2VkIHdpdGhpbiB0aGUgc2NoZW1hIG5vZGUsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIGlzQWxsb3dlZDogZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiAhIXRoaXMuZ2V0KCdhbGxvd2VkJylbdHlwZV07XG4gIH0sXG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSBtb2RlbCBmb3IgcmVwcmVzZW50aW5nIGVkaXRvciB3aWRnZXRzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxudmFyIFN0YXRlID0ge1xuICBSRUFEWTogMHgwMSxcbiAgREVTVFJPWUVEX1dJREdFVDogMHgwMixcbiAgREVTVFJPWUVEX1JFRlM6IDB4MDQsXG4gIERFU1RST1lFRDogMHgwNixcbn07XG5cbi8qKlxuICogQmFja2JvbmUgIE1vZGVsIGZvciByZXByZXNlbnRpbmcgZWRpdG9yIHdpZGdldHMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnV2lkZ2V0JyxcblxuICAvKipcbiAgICogQHR5cGUge29iamVjdH1cbiAgICpcbiAgICogQHByb3AgbWFya3VwXG4gICAqL1xuICBkZWZhdWx0czoge1xuXG4gICAgLyoqXG4gICAgICogVGhlIGNvbnRleHQgdGhlIHdpZGdldCBpcyBpbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgY29udGV4dElkOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRvIGJlIHNlbnQgd2l0aCB0aGUgY29tbWFuZC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtpbnR9XG4gICAgICovXG4gICAgaXRlbUlkOiAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdG8gYmUgc2VudCB3aXRoIHRoZSBjb21tYW5kLlxuICAgICAqXG4gICAgICogQHR5cGUge2ludH1cbiAgICAgKi9cbiAgICBpdGVtQ29udGV4dElkOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFRoZSBpbnRlcm5hbCBtYXJrdXAgdG8gZGlzcGxheSBpbiB0aGUgd2lkZ2V0LlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBtYXJrdXA6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdG8gYmUgc2VudCB3aXRoIHRoZSBjb21tYW5kLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBlZGl0czoge30sXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGUgcmVmZXJlbmNlZCBlZGl0IGJ1ZmZlciBpdGVtIGlzIGJlaW5nIGR1cGxpY2F0ZWQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7Ym9vbH1cbiAgICAgKi9cbiAgICBkdXBsaWNhdGluZzogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGVzdHJ1Y3Rpb24gc3RhdGUgZm9yIHRoZSB3aWRnZXQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7aW50fVxuICAgICAqL1xuICAgIHN0YXRlOiBTdGF0ZS5SRUFEWSxcbiAgfSxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiAoYXR0cmlidXRlcywgb3B0aW9ucykge1xuICAgIHRoaXMud2lkZ2V0ID0gb3B0aW9ucy53aWRnZXQ7XG4gICAgdGhpcy5fZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5ID0gb3B0aW9ucy5lZGl0QnVmZmVySXRlbVJlZkZhY3Rvcnk7XG4gICAgdGhpcy5fY29udGV4dFJlc29sdmVyID0gb3B0aW9ucy5jb250ZXh0UmVzb2x2ZXI7XG4gICAgQmFja2JvbmUuTW9kZWwuYXBwbHkodGhpcywgW2F0dHJpYnV0ZXMsIG9wdGlvbnNdKTtcbiAgfSxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIHNldDogZnVuY3Rpb24oYXR0cmlidXRlcywgb3B0aW9ucykge1xuICAgIHRoaXMuX2ZpbHRlckF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XG4gICAgcmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgfSxcblxuICAvKipcbiAgICogVHJpZ2dlcnMgYSByZXF1ZXN0IHRvIGVkaXQgdGhlIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbS5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBlZGl0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVkaXRCdWZmZXJJdGVtUmVmLmVkaXQodGhpcy5nZXQoJ2VkaXRzJykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBhIHJlcXVlc3QgdG8gZHVwbGljYXRlIHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0uXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgZHVwbGljYXRlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldCh7IGR1cGxpY2F0aW5nOiB0cnVlIH0pO1xuICAgIHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYuZHVwbGljYXRlKHRoaXMuZ2V0KCdpZCcpLCB0aGlzLmdldCgnZWRpdHMnKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBkZXN0cm95OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgLy8gSWYgdGhlIHdpZGdldCBoYXMgbm90IGFscmVhZHkgYmVlbiBtYXJrZWQgYXMgZGVzdHJveWVkIHdlIHRyaWdnZXIgYVxuICAgIC8vIGRlc3Ryb3kgZXZlbnQgb24gdGhlIHdpZGdldCBjb2xsZWN0aW9uIHNvIGl0IGNhbiBpbnN0cnVjdCBhbnl0aGluZyB0aGF0XG4gICAgLy8gcmVmZXJlbmNlcyB0aGlzIHdpZGdldCB0byBjbGVhbiBpdCBvdXQuIFJlZHVuZGFudCBkZXN0cm95IGNhbGxzIGFyZVxuICAgIC8vIGlnbm9yZWQuXG4gICAgaWYgKCF0aGlzLmhhc1N0YXRlKFN0YXRlLkRFU1RST1lFRCkpIHtcbiAgICAgIHRoaXMudHJpZ2dlcignZGVzdHJveScsIHRoaXMsIHRoaXMuY29sbGVjdGlvbiwgb3B0aW9ucyk7XG4gICAgICB0aGlzLnNldFN0YXRlKFN0YXRlLkRFU1RST1lFRCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBkZXN0cnVjdGlvbiBzdGF0ZSBmb3IgdGhpcyB3aWRnZXQuXG4gICAqXG4gICAqIEBwYXJhbSB7V2lkZ2V0TW9kZWwuU3RhdGV9IHN0YXRlXG4gICAqICAgVGhlIHN0YXRlIHRvIHNldCBvbiB0aGUgd2lkZ2V0IG1vZGVsLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIHNldFN0YXRlOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgIHJldHVybiB0aGlzLnNldCh7c3RhdGU6IHRoaXMuZ2V0KCdzdGF0ZScpIHwgc3RhdGV9KTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBkZXN0cnVjdGlvbiBzdGF0ZSBmb3IgdGhpcyB3aWRnZXQuXG4gICAqXG4gICAqIEBwYXJhbSB7V2lkZ2V0TW9kZWwuU3RhdGV9IHN0YXRlXG4gICAqICAgVGhlIHN0YXRlIHRvIGNoZWNrIGZvci5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbH1cbiAgICogICBUcnVlIG9mIHRoZSBtb2RlbCBoYXMgdGhlIHByb3ZpZGVkIHN0YXRlIHNldCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgaGFzU3RhdGU6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgcmV0dXJuICh0aGlzLmdldCgnc3RhdGUnKSAmIHN0YXRlKSA9PT0gc3RhdGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgYXR0cmlidXRlIGZpbHRlcmluZyBmb3IgJ3NldCcgbWV0aG9kIGNhbGxzLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gYXR0cmlidXRlc1xuICAgKiAgIFRoZSBhdHRyaWJ1dGVzIHRoYXQgbmVlZCB0byBiZSBmaWx0ZXJlZC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF9maWx0ZXJBdHRyaWJ1dGVzOiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgLy8gUnVuIHRoZSBjaGFuZ2UgaGFuZGxlciB0byByZWJ1aWxkIGFueSByZWZlcmVuY2VzIHRvIGV4dGVybmFsIG1vZGVsc1xuICAgIC8vIGlmIG5lY2Vzc2FyeS4gV2UgZG8gdGhpcyBoZXJlIGluc3RlYWQgb2Ygb24oJ2NoYW5nZScpIHRvIGVuc3VyZSB0aGF0XG4gICAgLy8gc3Vic2NyaWJlZCBleHRlcm5hbCBsaXN0ZW5lcnMgZ2V0IGNvbnNpc3RlbnQgYXRvbWljIGNoYW5nZVxuICAgIC8vIG5vdGlmaWNhdGlvbnMuXG4gICAgaWYgKHRoaXMuX3JlZnJlc2hFZGl0QnVmZmVySXRlbVJlZihhdHRyaWJ1dGVzKSB8fCBhdHRyaWJ1dGVzLmVkaXRzKSB7XG4gICAgICB0aGlzLl9zZXR1cExpc3RlbmVycyhhdHRyaWJ1dGVzKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsIGZ1bmN0aW9uIHRvIGhhbmRsZSBjaGFuZ2VzIHRvIHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0uXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhdHRyaWJ1dGVzXG4gICAqICAgQW4gYXR0cmlidXRlcyBvYmplY3QgdG8gcGFyc2UgZm9yIGNoYW5nZXMgdGhhdCBjb3VsZCBoYXZlIHNpZGUtZWZmZWN0cy5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbH1cbiAgICogICBUcnVlIGlmIHRoZSBjaGFuZ2VzIGluIHRoZSBhdHRyaWJ1dGVzIG9iamVjdCBzaWduYWxlZCB0aGF0IHRoaXMgbW9kZWxcbiAgICogICBuZWVkcyB0byBzdGFydCBsaXN0ZW5pbmcgdG8gbmV3IG9iamVjdHMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIF9yZWZyZXNoRWRpdEJ1ZmZlckl0ZW1SZWY6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgICAvLyBUcmFjayB3aGV0aGVyIHdlIG5lZWQgdG8gdXBkYXRlIHdoaWNoIHJlZmVyZW5jZWQgbW9kZWxzIHdlIGFyZVxuICAgIC8vIGxpc3RlbmluZyB0by5cbiAgICB2YXIgc2V0dXBMaXN0ZW5lcnMgPSBmYWxzZTtcblxuICAgIC8vIEdldCB0aGUgY29uc29saWRhdGVkIGxpc3Qgb2Ygb2xkIC8gdXBkYXRlZCBwcm9wZXJ0aWVzIHRvIGNoZWNrIGZvclxuICAgIC8vIGNoYW5nZXMuXG4gICAgdmFyIG9sZEl0ZW1Db250ZXh0ID0gdGhpcy5nZXQoJ2l0ZW1Db250ZXh0SWQnKTtcbiAgICB2YXIgb2xkV2lkZ2V0Q29udGV4dCA9IHRoaXMuZ2V0KCdjb250ZXh0SWQnKTtcbiAgICB2YXIgb2xkSXRlbUlkID0gdGhpcy5nZXQoJ2l0ZW1JZCcpO1xuICAgIHZhciBuZXdJdGVtQ29udGV4dCA9IGF0dHJpYnV0ZXMuaXRlbUNvbnRleHRJZCA/IGF0dHJpYnV0ZXMuaXRlbUNvbnRleHRJZCA6IG9sZEl0ZW1Db250ZXh0O1xuICAgIHZhciBuZXdXaWRnZXRDb250ZXh0ID0gYXR0cmlidXRlcy5jb250ZXh0SWQgPyBhdHRyaWJ1dGVzLmNvbnRleHRJZCA6IG9sZFdpZGdldENvbnRleHQ7XG4gICAgdmFyIG5ld0l0ZW1JZCA9IGF0dHJpYnV0ZXMuaXRlbUlkID8gYXR0cmlidXRlcy5pdGVtSWQgOiBvbGRJdGVtSWQ7XG5cbiAgICAvLyBJZiB0aGUgY29udGV4dCB0aGUgYnVmZmVyIGl0ZW0gaGFzIGNoYW5nZWQsIHRoZSBjb250ZXh0IG9mIHRoZSB3aWRnZXRcbiAgICAvLyBoYXMgY2hhbmdlZCwgb3IgdGhlIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbSBpZCBoYXMgY2hhbmdlZCB3ZSBuZWVkXG4gICAgLy8gdG8gcmVnZW5lcmF0ZSB0aGUgZWRpdCBidWZmZXIgaXRlbSByZWZlcmVuY2UgYW5kIGluc3RydWN0IHRoZSBjYWxsZXIgdG9cbiAgICAvLyB1cGRhdGUgdGhlIG1vZGVscyB0aGlzIHdpZGdldCBpcyBsaXN0ZW5pbmcgdG8uXG4gICAgaWYgKG5ld0l0ZW1Db250ZXh0ICE9IG9sZEl0ZW1Db250ZXh0IHx8IG5ld1dpZGdldENvbnRleHQgIT0gb2xkV2lkZ2V0Q29udGV4dCB8fCBuZXdJdGVtSWQgIT0gb2xkSXRlbUlkKSB7XG4gICAgICB0aGlzLmVkaXRCdWZmZXJJdGVtUmVmID0gdGhpcy5fZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LmNyZWF0ZUZyb21JZHMobmV3SXRlbUlkLCBuZXdJdGVtQ29udGV4dCwgbmV3V2lkZ2V0Q29udGV4dCk7XG4gICAgICBzZXR1cExpc3RlbmVycyA9IHRydWU7XG4gICAgICBhdHRyaWJ1dGVzLm1hcmt1cCA9IHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYuZWRpdEJ1ZmZlckl0ZW0uZ2V0KCdtYXJrdXAnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2V0dXBMaXN0ZW5lcnM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYW55IHN0YWxlIGxpc3RlbmVycyBhbmQgc2V0cyB1cCBmcmVzaCBsaXN0ZW5lcnMuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhdHRyaWJ1dGVzXG4gICAqICAgQW4gYXR0cmlidXRlcyBvYmplY3QgdG8gdXNlIHRvIGRldGVybWluZSB3aGljaCByZWxhdGVkIG1vZGVscyBuZWVkIHRvIGJlXG4gICAqICAgbGlzdGVuZWQgdG8uXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgX3NldHVwTGlzdGVuZXJzOiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKClcbiAgICAgIC5saXN0ZW5Ubyh0aGlzLmVkaXRCdWZmZXJJdGVtUmVmLmVkaXRCdWZmZXJJdGVtLCAnY2hhbmdlOm1hcmt1cCcsIHRoaXMuX3JlYWRGcm9tQnVmZmVySXRlbSlcbiAgICAgIC5saXN0ZW5Ubyh0aGlzLmVkaXRCdWZmZXJJdGVtUmVmLnNvdXJjZUNvbnRleHQsICdjaGFuZ2U6aWQnLCB0aGlzLl91cGRhdGVDb250ZXh0KVxuICAgICAgLmxpc3RlblRvKHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYudGFyZ2V0Q29udGV4dCwgJ2NoYW5nZTppZCcsIHRoaXMuX3VwZGF0ZUNvbnRleHQpO1xuXG4gICAgXy5lYWNoKGF0dHJpYnV0ZXMuZWRpdHMsIGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0U3RyaW5nKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5nZXQoY29udGV4dFN0cmluZyk7XG4gICAgICB0aGlzLmxpc3RlblRvKGNvbnRleHQsICdjaGFuZ2U6aWQnLCB0aGlzLl91cGRhdGVDb250ZXh0KTtcbiAgICB9LCB0aGlzKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBmdW5jdGlvbiB0byBjb3B5IHVwZGF0ZXMgZnJvbSB0aGUgcmVmZXJlbmNlZCBidWZmZXIgaXRlbS5cbiAgICpcbiAgICogQHBhcmFtIHtCYWNrYm9uZS5Nb2RlbH0gYnVmZmVySXRlbU1vZGVsXG4gICAqICAgVGhlIGJ1ZmZlciBpdGVtIG1vZGVsIHRvIGNvcHkgbWFya3VwIGNoYW5nZXMgZnJvbS5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF9yZWFkRnJvbUJ1ZmZlckl0ZW06IGZ1bmN0aW9uKGJ1ZmZlckl0ZW1Nb2RlbCkge1xuICAgIHRoaXMuc2V0KHttYXJrdXA6IGJ1ZmZlckl0ZW1Nb2RlbC5nZXQoJ21hcmt1cCcpfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsIGZ1bmN0aW9uIHRvIGhhbmRsZSB3aGVuIGEgcmVmZXJlbmNlZCBjb250ZXh0IGlkIGhhcyBjaGFuZ2VkLlxuICAgKlxuICAgKiBAcGFyYW0ge0JhY2tib25lLk1vZGVsfSBjb250ZXh0TW9kZWxcbiAgICogICBUaGUgY29udGV4dCBtb2RlbCB0aGF0IGhhcyBoYWQgYW4gaWQgYXR0cmlidXRlIGNoYW5nZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBfdXBkYXRlQ29udGV4dDogZnVuY3Rpb24oY29udGV4dE1vZGVsKSB7XG4gICAgdmFyIG9sZElkID0gY29udGV4dE1vZGVsLnByZXZpb3VzKCdpZCcpO1xuICAgIHZhciBuZXdJZCA9IGNvbnRleHRNb2RlbC5nZXQoJ2lkJyk7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSB7fTtcblxuICAgIC8vIFVwZGF0ZSBhbnkgY29udGV4dCBpZCByZWZlcmVuY2VzIHRoYXQgbWF5IG5lZWQgdG8gY2hhbmdlLlxuICAgIGlmICh0aGlzLmdldCgnaXRlbUNvbnRleHRJZCcpID09IG9sZElkKSB7XG4gICAgICBhdHRyaWJ1dGVzLml0ZW1Db250ZXh0SWQgPSBuZXdJZDtcbiAgICB9XG4gICAgaWYgKHRoaXMuZ2V0KCdjb250ZXh0SWQnKSA9PSBvbGRJZCkge1xuICAgICAgYXR0cmlidXRlcy5jb250ZXh0SWQgPSBuZXdJZDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgY29udGV4dCB3YXMgcmVmZXJlbmNlZCBieSBhbiBlZGl0IG9uIHRoZSBtb2RlbCwgdXBkYXRlIHRoZSBlZGl0LlxuICAgIHZhciBlZGl0cyA9IHRoaXMuZ2V0KCdlZGl0cycpO1xuICAgIGlmIChlZGl0c1tvbGRJZF0pIHtcbiAgICAgIGF0dHJpYnV0ZXMuZWRpdHMgPSB7fTtcbiAgICAgIF8uZWFjaChlZGl0cywgZnVuY3Rpb24odmFsdWUsIGNvbnRleHRTdHJpbmcpIHtcbiAgICAgICAgaWYgKGNvbnRleHRTdHJpbmcgPT0gb2xkSWQpIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzLmVkaXRzW25ld0lkXSA9IHZhbHVlLnJlcGxhY2Uob2xkSWQsIG5ld0lkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzLmVkaXRzW2NvbnRleHRTdHJpbmddID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0KGF0dHJpYnV0ZXMpO1xuICAgIHRoaXMudHJpZ2dlcigncmViYXNlJywgdGhpcywgb2xkSWQsIG5ld0lkKTtcbiAgfSxcblxufSk7XG5cbm1vZHVsZS5leHBvcnRzLlN0YXRlID0gU3RhdGU7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBjb21tYW5kcyBmcm9tIHRoZSBxdWV1ZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIHVuaW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91bmltcGxlbWVudGVkJyk7XG5cbi8qKlxuICogQSBiYXNlIGZvciBlZGl0b3IgYWRhcHRlciBwbHVnaW5zLlxuICpcbiAqIEFkYXB0ZXIgcGx1Z2lucyBhcmUgdGhlIGdsdWUgdGhhdCB0cmFuc2xhdGVzIGRhdGEgbXV0YXRpb25zIHdpdGhpbiB0aGVcbiAqIHdpZGdldCBiaW5kZXIgbGlicmFyeSBpbnRvIGEgc3BlY2lmaWMgZWRpdG9yJ3MgQVBJIGNhbGxzLiBBcyBsb25nIGFzIGFuXG4gKiBlZGl0b3IgdXNlcyB0aGUgRE9NIGFzIHRoZSBwcmltYXJ5IG1ldGhvZCBvZiBzdG9yYWdlLCB0aGUgd2lkZ2V0IGJpbmRlclxuICogbGlicmFyeSBjYW4gaGFuZGxlIG1vc3Qgb2YgdGhlIG11dGF0aW9ucyB3aXRob3V0IGVkaXRvciBzcGVjaWZpYyBjb2RlLiBFYWNoXG4gKiBlZGl0b3IgbWF5IGhhdmUgaXRzIG93biBmbGF2b3Igb2YgRE9NIHdyYXBwZXJzIGFuZCBpbmxpbmUgZWRpdGluZyBoYW5kbGluZyxcbiAqIHNvIHRoaXMgcGx1Z2luIGlzIHJlcXVpcmVkIHRvIGJyaWRnZSB0aGUgZ2FwIGJldHdlZW4gdGhlIGVkaXRvcidzIEFQSSBhbmRcbiAqIHRoZSBkYXRhIG9wZXJhdGlvbnMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuXG4gIC8qKlxuICAgKiBJbnNlcnRzIGFuIGVtYmVkIGNvZGUgaW50byB0aGUgZWRpdG9yLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCBpbnNlcnQgdGhlIG5ld2x5IGNyZWF0ZWQgZWxlbWVudCBhdCB0aGUgY3VycmVudCBlZGl0YWJsZSBjdXJzb3JcbiAgICogcG9zaXRpb24gd2l0aGluIHRoZSBlZGl0b3IuXG4gICAqXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gZW1iZWRDb2RlXG4gICAqICAgVGhlIGVtYmVkIGNvZGUgZWxlbWVudCB0byBiZSBpbnNlcnRlZC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGluc2VydEVtYmVkQ29kZTogZnVuY3Rpb24oZW1iZWRDb2RlKSB7XG4gICAgdW5pbXBsZW1lbnRlZChlbWJlZENvZGUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgd2lkZ2V0IGZyb20gdGhlIGVkaXRvci5cbiAgICpcbiAgICogVGhpcyBzaG91bGQgcmVtb3ZlIHRoZSB3aWRnZXQgYmFzZWQgb24gaXRzIHVuaXF1ZSBpZCBhbmQgZnJlZSBhbnlcbiAgICogYXNzb2NpYXRlZCBtZW1vcnkuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgd2lkZ2V0IHRvIGJlIGRlc3Ryb3llZC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGRlc3Ryb3lXaWRnZXQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgdW5pbXBsZW1lbnRlZChpZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldHMgdXAgYW4gaW5saW5lIGVkaXRhYmxlIGZpZWxkIHdpdGhpbiBhIHdpZGdldC5cbiAgICpcbiAgICogVGhlIHdpZGdldFZpZXcgcGFyYW1ldGVyIGdpdmVzIHRoZSBhZGFwdGVyIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgdGhhdFxuICAgKiBzaG91bGQgYmUgaW5saW5lLWVkaXRhYmxlLiBUaGUgY29udGV4dElkIGFsbG93cyBhY2Nlc3MgdG8gdGhlIGN1cnJlbnRcbiAgICogaW5saW5lIGVkaXRzIGZvciB0aGUgcGFydGljdWxhciBjb250ZXh0LCBhbmQgdGhlIHNlbGVjdG9yIGlzIGEgalF1ZXJ5IHN0eWxlXG4gICAqIHNlbGVjdG9yIGRpY3RhdGluZyB3aGljaCBub2RlIGluIHRoZSB3aWRnZXRWaWV3IERPTSB3aWxsIGJlY29tZVxuICAgKiBpbmxpbmUtZWRpdGFibGUuXG4gICAqXG4gICAqIEBwYXJhbSB7QmFja2JvbmUuVmlld30gd2lkZ2V0Vmlld1xuICAgKiAgIFRoZSB2aWV3IGZvciB0aGUgd2lkZ2V0IHRoYXQgY29udGFpbnMgdGhlIGZpZWxkIHRoYXQgd2lsbCBiZWNvbWVcbiAgICogICBlZGl0YWJsZS5cbiAgICogQHBhcmFtIHttaXhlZH0gY29udGV4dElkXG4gICAqICAgVGhlIGNvbnRleHQgaWQgdG8gb2YgdGhlIGZpZWxkIHRoYXQgc2hvdWxkIGJlY29tZSBpbmxpbmUgZWRpdGFibGUuIEVhY2hcbiAgICogICBlZGl0YWJsZSBmaWVsZCBkZWZpbmVzIGEgdW5pcXVlIGNvbnRleHQgZm9yIGl0cyBjaGlsZHJlbi5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yXG4gICAqICAgQSBqUXVlcnkgc3R5bGUgc2VsZWN0b3IgZm9yIHNwZWNpZnlpbmcgd2hpY2ggZWxlbWVudCB3aXRoaW4gdGhlIHdpZGdldFxuICAgKiAgIHNob3VsZCBiZWNvbWUgZWRpdGFibGUuIFRoZSBzZWxlY3RvciBpcyByZWxhdGl2ZSB0byB0aGUgdmlldydzIHJvb3QgZWxcbiAgICogICBwcm9wZXJ0eS5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGF0dGFjaElubGluZUVkaXRpbmc6IGZ1bmN0aW9uKHdpZGdldFZpZXcsIGNvbnRleHRJZCwgc2VsZWN0b3IpIHtcbiAgICB1bmltcGxlbWVudGVkKHdpZGdldFZpZXcsIGNvbnRleHRJZCwgc2VsZWN0b3IpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZWFkcyB0aGUgaW5saW5lIGVkaXQgZm9yIGFuIGVkaXRhYmxlIHdpZGdldCBmaWVsZCBmcm9tIHRoZSB3aWRnZXQncyBET00uXG4gICAqXG4gICAqIEBwYXJhbSB7QmFja2JvbmUuVmlld30gd2lkZ2V0Vmlld1xuICAgKiAgIFRoZSB2aWV3IGZvciB0aGUgd2lkZ2V0IHRoYXQgY29udGFpbnMgdGhlIGZpZWxkIHRvIHJlYWQgaW5saW5lIGVkaXRzXG4gICAqICAgZnJvbS5cbiAgICogQHBhcmFtIHttaXhlZH0gY29udGV4dElkXG4gICAqICAgVGhlIGNvbnRleHQgaWQgdG8gcmVhZCB0aGUgaW5saW5lIGVkaXQgZnJvbS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yXG4gICAqICAgQSBqUXVlcnkgc3R5bGUgc2VsZWN0b3IgZm9yIHNwZWNpZnlpbmcgd2hpY2ggZWxlbWVudCB3aXRoaW4gdGhlIHdpZGdldFxuICAgKiAgIHNob3VsZCB0aGUgaW5saW5lIGVkaXRzIHNob3VsZCBiZSByZWFkIGZyb20uIFRoZSBzZWxlY3RvciBpcyByZWxhdGl2ZSB0b1xuICAgKiAgIHRoZSB2aWV3J3Mgcm9vdCBlbCBwcm9wZXJ0eS5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKiAgIFRoZSBwcm9jZXNzZWQgaW5saW5lIGVkaXQgbWFya3VwIGZvciB0aGUgc3BlY2lmaWVkIGNvbnRleHRJZC5cbiAgICovXG4gIGdldElubGluZUVkaXQ6IGZ1bmN0aW9uKHdpZGdldFZpZXcsIGNvbnRleHRJZCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gdW5pbXBsZW1lbnRlZCh3aWRnZXRWaWV3LCBjb250ZXh0SWQsIHNlbGVjdG9yKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgcm9vdCBET00gZWxlbWVudCBmb3IgdGhlIGVkaXRvci5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgdGVsbHMgdGhlIGVkaXRvciBob3cgdG8gXG4gICAqXG4gICAqIEByZXR1cm4ge0RPTUVsZW1lbnR9XG4gICAqICAgVGhlIHJvb3QgRE9NIGVsZW1lbnQgZm9yIHRoZSBlZGl0b3IuXG4gICAqL1xuICBnZXRSb290RWw6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB1bmltcGxlbWVudGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFuIG9wdGlvbmFsIG1ldGhvZCBmb3IgcGVyZm9ybWluZyBhbnkgY2xlYW51cCBhZnRlciB0cmFja2VyIGRlc3RydWN0aW9uLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIHdpZGdldCB0cmFja2VyIGhhcyBiZWVuIGRlc3Ryb3llZC4gSXQgaXNcbiAgICogdXN1YWxseSBub3QgbmVjZXNzYXJ5IHRvIGltcGxlbWVudCB0aGlzIG1ldGhvZC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGNsZWFudXA6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cy5leHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhbiBpbnRlcmZhY2UgZm9yIHByb3RvY29sIHBsdWdpbnMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICB1bmltcGxlbWVudGVkID0gcmVxdWlyZSgnLi4vdW5pbXBsZW1lbnRlZCcpO1xuXG4vKipcbiAqIEEgYmFzZSBmb3IgcHJvdG9jb2wgcGx1Z2lucy5cbiAqXG4gKiBQcm90b2NvbCBwbHVnaW5zIGhhbmRsZSB0aGUgcmVxdWVzdCAvIHJlc3BvbnNlIG1lY2hhbmlzbSBmb3Igc3luY2luZyBkYXRhIHRvXG4gKiBhbmQgZnJvbSB0aGUgc2VydmVyLiBUaGV5IHByb3ZpZGUgYSBzaW5nbGUgbWV0aG9kICdzZW5kJyB0aGF0IHdpbGwgYmUgY2FsbGVkXG4gKiB3aGVuIHJlcXVlc3RzIGFyZSBkaXNwYXRjaGVkLlxuICpcbiAqIFRoZSBjb21tYW5kIHJlc29sdmVyIGlzIHVzZWQgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYmFjayBpbnRvIHRoZSB0cmFja2luZ1xuICogc3lzdGVtIGFzeW5jaHJvbm91c2x5LlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIFNlbmRzIGEgcmVxdWVzdCB0byB0aGUgZGF0YSBzdG9yZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGluaXRpYXRlIGEgcmVxdWVzdCwgdGhlbiBjYWxsIHJlc29sdmVyLnJlc29sdmUoZGF0YSlcbiAgICogd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAqIFxuICAgKiBUaGUgZGF0YSBvYmplY3QgcGFzc2VkIHRvIHJlc29sdmUoKSBtYXkgY29udGFpbiBvbmUgb3IgbW9yZSBvZjogJ2NvbnRleHQnLFxuICAgKiAnd2lkZ2V0JywgJ2VkaXRCdWZmZXJJdGVtJywgJ3NjaGVtYScuIEVhY2ggZW50cnkgc2hvdWxkIGJlIGEgZGF0YSBtb2RlbFxuICAgKiBrZXllZCBieSB0aGUgaWQgb2YgdGhlIGRhdGEgbW9kZWwuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgVGhlIHJlcXVlc3QgdHlwZS4gVGhpcyBjYW4gYmUgb25lIG9mOiAnSU5TRVJUX0lURU0nLCAnUkVOREVSX0lURU0nLFxuICAgKiAgICdEVVBMSUNBVEVfSVRFTScsICdGRVRDSF9TQ0hFTUEnLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YVxuICAgKiAgIFRoZSBkYXRhIHRvIGJlIHNlbnQgaW4gdGhlIHJlcXVlc3QuXG4gICAqIEBwYXJhbSB7U3luY0FjdGlvblJlc29sdmVyfSByZXNvbHZlclxuICAgKiAgIFRoZSByZXNvbHZlciBzZXJ2aWNlIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHJlc29sdmUgdGhlIGNvbW1hbmQuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBzZW5kOiBmdW5jdGlvbih0eXBlLCBkYXRhLCByZXNvbHZlcikge1xuICAgIHVuaW1wbGVtZW50ZWQodHlwZSwgZGF0YSwgcmVzb2x2ZXIpO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cy5leHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICogQSBjZW50cmFsIGRpc3BhdGNoZXIgZm9yIHNlbmRpbmcgY29tbWFuZHMgdG8gdGhlIGNhbm9uaWNhbCBkYXRhIHN0b3JlLlxuICpcbiAqIERlZmF1bHQgU3VwcG9ydGVkIEFjdGlvbnM6XG4gKlxuICogICBJTlNFUlRfSVRFTTogUmVxdWVzdHMgYSBuZXcgZWRpdCBidWZmZXIgaXRlbSBmcm9tIHRoZSBkYXRhIHN0b3JlLiBUaGlzXG4gKiAgIHRyaWdnZXJzIHRoZSBjcmVhdGlvbiBvZiBhbiBlZGl0IGJ1ZmZlciBpdGVtIG9uIHRoZSBzZXJ2ZXIsIGFuZCBzaG91bGRcbiAqICAgcmVzb2x2ZSB3aXRoIHRoZSBuZXcgaXRlbS5cbiAqXG4gKiAgIEVESVRfSVRFTTogUmVxdWVzdHMgdGhhdCBhbiBleGlzdGluZyBlZGl0IGJ1ZmZlciBpdGVtIGJlIGVkaXRlZC4gVGhpc1xuICogICB0cmlnZ2VycyBhbiBlZGl0IGZsb3cgb24gdGhlIHNlcnZlci4gVGhlIGFjdHVhbCBkZXRhaWxzIG9mIHRoYXQgZmxvdyBhcmVcbiAqICAgbm90IGVuZm9yY2VkLiBGb3IgZXhhbXBsZSwgdGhlIHNlcnZlciBtYXkgZGVsaXZlciBiYWNrIGFuIGFqYXggZm9ybSBmb3IgdGhlXG4gKiAgIGVkaXQgYnVmZmVyIGl0ZW0gYW5kIHJlc29sdmUgdGhlIGFjdGlvbiBvbmNlIHRoYXQgZm9ybSBpcyBzdWJtaXR0ZWQuIFRoZVxuICogICByZXNvbHV0aW9uIHNob3VsZCBpbmNsdWRlIHRoZSB1cGRhdGVzIG1hZGUgdG8gdGhlIGVkaXQgYnVmZmVyIGl0ZW0gbW9kZWwuXG4gKlxuICogICBSRU5ERVJfSVRFTTogUmVxdWVzdHMgdGhlIHJlcHJlc2VudGF0aW9uYWwgbWFya3VwIGZvciBhIGRhdGEgZW50aXR5IHRoYXRcbiAqICAgd2lsbCBiZSByZW5kZXJlZCBpbiB0aGUgZWRpdG9yIHZpZXdtb2RlLiBUaGUgY29tbWFuZCBzaG91bGQgcmVzb2x2ZSB3aXRoXG4gKiAgIHRoZSBlZGl0IGJ1ZmZlciBpdGVtIG1vZGVsIGNvbnRhaW5pbmcgdGhlIHVwZGF0ZWQgbWFya3VwLiBUaGlzIG1hcmt1cCB3aWxsXG4gKiAgIGF1dG9tYXRpY2FsbHkgYmUgc3luY2VkIHRvIHRoZSB3aWRnZXQuIFRoZSBtYXJrdXAgY2FuIGFsc28gY29udGFpbiBpbmxpbmVcbiAqICAgZWRpdGFibGUgZmllbGRzIGluIHRoZSBmb3JtYXQgc3BlY2lmaWVkIGJ5IHRoZSBzeW5jIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogICBEVVBMSUNBVEVfSVRFTTogUmVxdWVzdHMgdGhhdCBhbiBpdGVtIGJlIGR1cGxpY2F0ZWQgaW4gdGhlIHN0b3JlLCByZXN1bHRpbmdcbiAqICAgaW4gYSBuZXdseSBjcmVhdGVkIGl0ZW0uIFRoaXMgY29tbWFuZCBzaG91bGQgcmVzb2x2ZSB3aXRoIHRoZSBuZXdseSBjcmVhdGVkXG4gKiAgIGVkaXQgYnVmZmVyIG1vZGVsLlxuICpcbiAqICAgRkVUQ0hfU0NIRU1BOiBSZXF1ZXN0cyB0aGUgc2NoZW1hIGZvciBhIGZpZWxkIGZyb20gdGhlIHNlcnZlci4gVGhpcyBzaG91bGRcbiAqICAgcmVzb2x2ZSB3aXRoIGEgc2NoZW1hIG1vZGVsIGRldGFpbGluZyB3aGljaCBvdGhlciB0eXBlcyBvZiBmaWVsZHMgY2FuIGJlXG4gKiAgIG5lc3RlZCBpbnNpZGUgdGhlIGdpdmVuIGZpZWxkIHR5cGUuXG4gKlxuICogQHBhcmFtIHtTeW5jUHJvdG9jb2x9IHByb3RvY29sXG4gKiAgIEEgcHJvdG9jb2wgcGx1Z2luIGZvciBoYW5kbGluZyB0aGUgcmVxdWVzdCAvIHJlc3BvbnNlIHRyYW5zYWN0aW9uLlxuICogQHBhcmFtIHtTeW5jQWN0aW9uUmVzb2x2ZXJ9IHJlc29sdmVyXG4gKiAgIFRoZSByZXNvbHZlciBzZXJ2aWNlIGZvciBwcm9jZXNzaW5nIHN5bmMgYWN0aW9uIHJlc3BvbnNlcy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwcm90b2NvbCwgcmVzb2x2ZXIpIHtcbiAgdGhpcy5fcHJvdG9jb2wgPSBwcm90b2NvbDtcbiAgdGhpcy5fcmVzb2x2ZXIgPSByZXNvbHZlcjtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBEaXNwYXRjaGVzIGEgc3luYyBhY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgU2hvdWxkIGJlIG9uZSBvZjogJ0lOU0VSVF9JVEVNJywgJ0VESVRfSVRFTScsICdSRU5ERVJfSVRFTScsXG4gICAqICAgJ0RVUExJQ0FURV9JVEVNJywgJ0ZFVENIX1NDSEVNQScuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhXG4gICAqICAgQXJiaXRyYXJ5IGRhdGEgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0LlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZGlzcGF0Y2g6IGZ1bmN0aW9uKHR5cGUsIGRhdGEpIHtcbiAgICB0aGlzLl9wcm90b2NvbC5zZW5kKHR5cGUsIGRhdGEsIHRoaXMuX3Jlc29sdmVyKTtcbiAgfVxuXG59KTtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBBIGNsYXNzIGZvciByZXNvbHZpbmcgZGlzcGF0Y2hlZCBhY3Rpb25zLlxuICpcbiAqIERpc3BhdGNoZWQgYWN0aW9ucyBhcmUgcmVzb2x2ZWQgYnkgY2hlY2tpbmcgdGhlIHJlc3BvbnNlIGZvciBtb2RlbHMgdGhhdFxuICogc2hvdWxkIGJlIGFkZGVkIHRvIHRoZSBhcHByb3ByaWF0ZSBjb2xsZWN0aW9uLlxuICpcbiAqIFRoZSByZXNvbHZlciBzZXJ2aWNlIGlzIHNldCB1cCB3aXRoIGEgbWFwcGluZ3Mgb2YgbW9kZWxzLXRvLWNvbGxlY3Rpb25zIGFuZFxuICogdXNlcyB0aGlzIG1hcHBpbmcgdG8gdXBkYXRlIHRoZSBhc3NvY2lhdGVkIGNvbGxlY3Rpb24gd2hlbiBpdCBzZWVzIGEgbW9kZWxcbiAqIHRoYXQgaGFzIGJlZW4gbWFwcGVkLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jb2xsZWN0aW9ucyA9IHt9O1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBtb2RlbC10by1jb2xsZWN0aW9uIG1hcC5cbiAgICpcbiAgICogVGhpcyBtYXAgaXMgdXNlZCB0byBhZGQgbW9kZWxzIGluIHRoZSByZXNwb25zZSB0byB0aGUgYXBwcm9wcmlhdGVcbiAgICogY29sbGVjaXRvbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGVsTmFtZVxuICAgKiAgIFRoZSBrZXkgaW4gdGhlIHJlc3BvbnNlIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgbW9kZWwgdG8gYmUgYWRkZWQgdG8gdGhlXG4gICAqICAgc3BlY2lmaWVkIGNvbGxlY3Rpb24uXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGNvbGxlY3Rpb25DYWxsYmFja1xuICAgKiAgIElmIHRoZSBwYXNzZWQgdmFsdWUgaXMgYSBCYWNrYm9uZS5Db2xsZWN0aW9uLCBtb2RlbHMgaW4gdGhlIHJlc3BvbnNlIHdpbGxcbiAgICogICBiZSBhZGRlZCBkaXJlY3RseSB0byB0aGlzIGNvbGxlY3Rpb24uIElmIHRoZSBwYXNzZWQgdmFsdWUgaXMgYSBmdW5jdGlvbixcbiAgICogICB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgbW9kZWwgYXR0cmlidXRlcyBpbiB0aGVcbiAgICogICByZXNwb25zZSBhbmQgc2hvdWxkIHJldHVybiB0aGUgcmVzb2x2ZWQgY29sbGVjdGlvbi4gVGhlIG1vZGVsIHdpbGwgYmVcbiAgICogICBhZGRlZCB0byB0aGUgcmVzb2x2ZWQgY29sbGVjdGlvbiBpbiB0aGlzIGNhc2UuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBhZGRDb2xsZWN0aW9uOiBmdW5jdGlvbihtb2RlbE5hbWUsIGNvbGxlY3Rpb25DYWxsYmFjaykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb25zW21vZGVsTmFtZV0gPSBjb2xsZWN0aW9uQ2FsbGJhY2s7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlc29sdmVzIGEgZGlzcGF0Y2hlZCBzeW5jIGFjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlXG4gICAqICAgQSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZSBhY3Rpb24gcmVzcG9uc2UuIEtleXMgaW4gdGhpc1xuICAgKiAgIG9iamVjdCBzaG91bGQgYmUgbW9kZWwgbmFtZXMgYXMgcGFzc2VkIHRvIHRoZSBhZGRDb2xsZWN0aW9uIG1ldGhvZC4gVGhlXG4gICAqICAgdmFsdWVzIGluIHRoaXMgb2JqZWN0IHNob3VsZCBiZSBtb2RlbHMgdG8gYmUgYWRkZWQgdG8gdGhlIGFzc29jaWF0ZWRcbiAgICogICBjb2xsZWN0aW9uLiBFYWNoIGVudHJ5IGluIHRoZSBvYmplY3Qgc2hvdWxkIGNvbnRhaW4gYSBqYXZhc2NyaXB0IG9iamVjdCxcbiAgICogICBrZXllZCBieSB0aGUgbW9kZWwncyBpZCwgYW5kIGNvbnRhaW5nIHRoZSBtb2RlbCBhdHRyaWJ1dGVzIHRvIGJlIHNldCBpblxuICAgKiAgIHRoZSBjb2xsZWN0aW9uIGFzIGEgdmFsdWUuXG4gICAqXG4gICAqICAgW1xuICAgKiAgICB7XG4gICAqICAgICAgdHlwZTogJ2Fzc2V0JyxcbiAgICogICAgICBpZDogJycsXG4gICAqICAgICAgYXR0cmlidXRlczogJycsXG4gICAqICAgIH0sXG4gICAqICAgXVxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgcmVzb2x2ZTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICBfLmVhY2gocmVzcG9uc2UsIGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICBpZiAodGhpcy5fY29sbGVjdGlvbnNbbW9kZWwudHlwZV0pIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlTW9kZWwobW9kZWwsIHRoaXMuX2NvbGxlY3Rpb25zW21vZGVsLnR5cGVdKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkcyBtb2RlbHMgdG8gYSBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gbW9kZWxcbiAgICogICBBbiBvYmplY3Qgd2hlcmUga2V5cyBhcmUgbW9kZWwgaWRzIGFuZCB2YWx1ZXMgYXJlIG1vZGVsIGF0dHJpYnV0ZXMuXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGNvbGxlY3Rpb25cbiAgICogICBDYW4gZWl0aGVyIGJlIGEgQmFja2JvbmUuQ29sbGVjdGlvbiB0byBhZGQgdGhlIG1vZGVsIHRvLCBvciBhIGNhbGxiYWNrXG4gICAqICAgd2hpY2ggcmV0dXJucyB0aGUgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF91cGRhdGVNb2RlbDogZnVuY3Rpb24obW9kZWwsIGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgcmVzb2x2ZWRDb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcblxuICAgIC8vIElmIGEgZnVuY3Rpb24gaXMgcGFzc2VkIGFzIHRoZSBjb2xsZWN0aW9uLCB3ZSBjYWxsIGl0IHRvIHJlc29sdmUgdGhlXG4gICAgLy8gYWN0dWFsIGNvbGxlY3Rpb24gZm9yIHRoaXMgbW9kZWwuXG4gICAgaWYgKHR5cGVvZiBjb2xsZWN0aW9uID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJlc29sdmVkQ29sbGVjdGlvbiA9IGNvbGxlY3Rpb24obW9kZWwuYXR0cmlidXRlcyk7XG4gICAgfVxuXG4gICAgLy8gV2UgZmlyc3QgdHJ5IHRvIGxvYWQgdGhlIGV4aXN0aW5nIG1vZGVsIGluc3RlYWQgb2YgZGlyZWN0bHkgc2V0dGluZyB0aGVcbiAgICAvLyBtb2RlbCBpbiBjb2xsZWN0aW9uIHNpbmNlIGl0IGlzIGNvbXBsZXRlbHkgdmFsaWQgZm9yIGEgbW9kZWwncyBpZCB0b1xuICAgIC8vIGNoYW5nZS5cbiAgICB2YXIgZXhpc3RpbmcgPSByZXNvbHZlZENvbGxlY3Rpb24uZ2V0KG1vZGVsLmlkKTtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGV4aXN0aW5nLnNldChtb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAoIW1vZGVsLmF0dHJpYnV0ZXMuaWQpIHtcbiAgICAgICAgbW9kZWwuYXR0cmlidXRlcy5pZCA9IG1vZGVsLmlkO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZWRDb2xsZWN0aW9uLmFkZChtb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICB9XG4gIH1cblxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICogQGluaGVyaXRkb2NcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgbWFya3VwLCBhY3Rpb25zKSB7XG4gIHZhciBkaXNwbGF5RWxlbWVudCA9IGVsZW1lbnRGYWN0b3J5LmNyZWF0ZSgnd2lkZ2V0LWRpc3BsYXknKTtcbiAgdmFyIHRvb2xiYXJFbGVtZW50ID0gZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd0b29sYmFyJyk7XG4gIHZhciB0b29sYmFySXRlbUVsZW1lbnQgPSBlbGVtZW50RmFjdG9yeS5jcmVhdGUoJ3Rvb2xiYXItaXRlbScpO1xuICB2YXIgY29tbWFuZEVsZW1lbnQgPSBlbGVtZW50RmFjdG9yeS5jcmVhdGUoJ3dpZGdldC1jb21tYW5kJyk7XG5cbiAgdmFyIHJlc3VsdCA9IGRpc3BsYXlFbGVtZW50LnJlbmRlck9wZW5pbmdUYWcoKVxuICAgICsgbWFya3VwXG4gICAgKyB0b29sYmFyRWxlbWVudC5yZW5kZXJPcGVuaW5nVGFnKCk7XG5cbiAgXy5lYWNoKGFjdGlvbnMsIGZ1bmN0aW9uKGRlZiwgaWQpIHtcbiAgICByZXN1bHQgKz0gdG9vbGJhckl0ZW1FbGVtZW50LnJlbmRlck9wZW5pbmdUYWcoKVxuICAgICAgKyBjb21tYW5kRWxlbWVudC5zZXRBdHRyaWJ1dGUoJzxjb21tYW5kPicsIGlkKS5yZW5kZXJPcGVuaW5nVGFnKCkgKyBkZWYudGl0bGUgKyBjb21tYW5kRWxlbWVudC5yZW5kZXJDbG9zaW5nVGFnKClcbiAgICAgICsgdG9vbGJhckl0ZW1FbGVtZW50LnJlbmRlckNsb3NpbmdUYWcoKTtcbiAgfSk7XG5cbiAgcmVzdWx0ICs9IHRvb2xiYXJFbGVtZW50LnJlbmRlckNsb3NpbmdUYWcoKVxuICAgICsgZGlzcGxheUVsZW1lbnQucmVuZGVyQ2xvc2luZ1RhZygpO1xuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqIEBpbmhlcml0ZG9jXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIGZpZWxkcywgZWRpdHMpIHtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuXG4gIGlmIChmaWVsZHMpIHtcbiAgICBfLmVhY2goZmllbGRzLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IGVsZW1lbnRGYWN0b3J5LmNyZWF0ZShub2RlLnR5cGUsIG5vZGUpO1xuICAgICAgdmFyIGVkaXQ7IFxuXG4gICAgICBpZiAobm9kZS50eXBlID09ICdmaWVsZCcpIHtcbiAgICAgICAgaWYgKG5vZGUuY29udGV4dCkge1xuICAgICAgICAgIGVkaXQgPSBlZGl0c1tub2RlLmNvbnRleHRdO1xuICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCc8ZWRpdGFibGU+JywgJ3RydWUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnPGVkaXRhYmxlPicsICdmYWxzZScpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdCArPSBlbGVtZW50LnJlbmRlck9wZW5pbmdUYWcoKTtcblxuICAgICAgaWYgKGVkaXQpIHtcbiAgICAgICAgcmVzdWx0ICs9IGVkaXQ7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmVzdWx0ICs9IG1vZHVsZS5leHBvcnRzKGVsZW1lbnRGYWN0b3J5LCBub2RlLmNoaWxkcmVuLCBlZGl0cyk7XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdCArPSBlbGVtZW50LnJlbmRlckNsb3NpbmdUYWcoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSB2aWV3IGZvciB3cmFwcGluZyBjb250ZXh0IGNvbnRhaW5pbmcgRE9NIG5vZGVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuLyoqXG4gKiBCYWNrYm9uZSB2aWV3IGZvciB1cGRhdGluZyB0aGUgZWRpdG9yIGVsZW1lbnQuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oYXR0cmlidXRlcywgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucy5lbGVtZW50RmFjdG9yeSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXF1aXJlZCBlbGVtZW50RmFjdG9yeSBvcHRpb24gbWlzc2luZy4nKTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbGVtZW50RmFjdG9yeSA9IG9wdGlvbnMuZWxlbWVudEZhY3Rvcnk7XG5cbiAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsICdjaGFuZ2U6aWQnLCB0aGlzLnJlbmRlcik7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCAnZGVzdHJveScsIHRoaXMuc3RvcExpc3RlbmluZyk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVuZGVycyB0aGUgZWRpdG9yIGVsZW1lbnQuXG4gICAqXG4gICAqIFRoaXMganVzdCBleGlzdHMgdG8ga2VlcCB0aGUgY29udGV4dCBhdHRyaWJ1dGUgaW4gc3luYyB3aXRoIHRoZSBkYXRhXG4gICAqIG1vZGVsLiBUaGlzIHNob3VsZCAqbmV2ZXIqIGNoYW5nZSB0aGUgYWN0dWFsIGNvbnRlbnRzIG9mIHRoZSB2aWV3IGVsZW1lbnQuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLl9lbGVtZW50RmFjdG9yeS5nZXRUZW1wbGF0ZSgnZmllbGQnKTtcbiAgICB0aGlzLiRlbC5hdHRyKHRlbXBsYXRlLmdldEF0dHJpYnV0ZU5hbWUoJzxjb250ZXh0PicpLCB0aGlzLm1vZGVsLmdldCgnY29udGV4dCcpKTtcbiAgICB0aGlzLnRyaWdnZXIoJ0RPTU11dGF0ZScsIHRoaXMsIHRoaXMuJGVsKTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIHZpZXcgZm9yIHJlcHJlc2VudGluZyB3aWRnZXRzIHdpdGhpbiB0aGUgZWRpdG9yLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgJCA9IEJhY2tib25lLiQsXG4gIFdpZGdldFZpZXcgPSByZXF1aXJlKCcuL1dpZGdldFZpZXcnKSxcbiAgdW5pbXBsZW1lbnRlZCA9IHJlcXVpcmUoJy4uL3VuaW1wbGVtZW50ZWQnKTtcblxuLyoqXG4gKiBCYWNrYm9uZSB2aWV3IGZvciByZXByZXNlbnRpbmcgd2lkZ2V0cyB3aXRoaW4gdGhlIGVkaXRvci5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAYXVnbWVudHMgQmFja2JvbmUuTW9kZWxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBXaWRnZXRWaWV3LmV4dGVuZCh7XG5cbiAgcHJvY2Vzc2luZ0luZGljYXRvcjogJy4uLicsXG5cbiAgYWN0aW9uczoge1xuICAgIGVkaXQ6IHtcbiAgICAgIHRpdGxlOiAnRWRpdCcsXG4gICAgICBjYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc2F2ZSgpLmVkaXQoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHJlbW92ZToge1xuICAgICAgdGl0bGU6ICdSZW1vdmUnLFxuICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBXaWRnZXRWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICBpZiAob3B0aW9ucy5wcm9jZXNzaW5nSW5kaWNhdG9yKSB7XG4gICAgICB0aGlzLnByb2Nlc3NpbmdJbmRpY2F0b3IgPSBvcHRpb25zLnByb2Nlc3NpbmdJbmRpY2F0b3I7XG4gICAgfVxuXG4gICAgdmFyIHdpZGdldENvbW1hbmRUZW1wbGF0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCd3aWRnZXQtY29tbWFuZCcpO1xuICAgIHRoaXMuY29tbWFuZFNlbGVjdG9yID0gd2lkZ2V0Q29tbWFuZFRlbXBsYXRlLmdldFNlbGVjdG9yKCk7XG4gICAgdGhpcy5jb21tYW5kQXR0cmlidXRlID0gd2lkZ2V0Q29tbWFuZFRlbXBsYXRlLmdldEF0dHJpYnV0ZU5hbWUoJzxjb21tYW5kPicpO1xuXG4gICAgLy8gU2V0IHVwIHRoZSBjaGFuZ2UgaGFuZGxlci5cbiAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsICdjaGFuZ2UnLCB0aGlzLl9jaGFuZ2VIYW5kbGVyKTtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsICdyZWJhc2UnLCB0aGlzLl9yZWJhc2UpO1xuXG4gICAgdGhpcy5fc3RhbGUgPSB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICpcbiAgICogQHBhcmFtIHtFbGVtZW50RmFjdG9yeX0gZWxlbWVudEZhY3RvcnlcbiAgICogICBUaGUgZWxlbWVudCBmYWN0b3J5IHRoYXQgd2lsbCBiZSB1c2VkIHRvIGNyZWF0ZSBlbGVtZW50IHRlbXBsYXRlcy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1hcmt1cFxuICAgKiAgIFRoZSBtYXJrdXAgdG8gYmUgcmVuZGVyZWQgZm9yIHRoZSB3aWRnZXQuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhY3Rpb25zXG4gICAqICAgQSBtYXBwaW5nIHdoZXJlIGVhY2gga2V5IGlzIGFuIGFjdGlvbiBuYW1lLCBhbmQgZWFjaCBlbnRyeSBpcyBhbiBvYmplY3RcbiAgICogICBjb250YWluaW5nIHRoZSBmb2xsb3dpbmcgZW50cmllczpcbiAgICogICAgLSB0aXRsZTogVGhlIHRpdGxlIHRvIGRpc3BsYXkgdG8gdGhlIHVzZXIuXG4gICAqICAgIC0gY2FsbGJhY2s6IFRoZSBjYWxsYmFjayBmb3Igd2hlbiB0aGUgYWN0aW9uIGlzIHRyaWdnZXJlZC5cbiAgICovXG4gIHRlbXBsYXRlOiBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgbWFya3VwLCBhY3Rpb25zKSB7XG4gICAgdW5pbXBsZW1lbnRlZChlbGVtZW50RmFjdG9yeSwgbWFya3VwLCBhY3Rpb25zKTtcbiAgfSxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGVcbiAgICogICBPbmUgb2Y6XG4gICAqICAgICAtICdkdXBsaWNhdGluZyc6IFJlLXJlbmRlcnMgdGhlIGVudGlyZSB2aWV3IHdpdGggdGhlIGR1cGxpY2F0aW5nXG4gICAqICAgICAgIGluZGljYXRvci5cbiAgICogICAgIC0gJ2NvbnRhaW5lcic6IFJlLXJlbmRlcnMgdGhlIGNvbnRhaW5lciB3aGlsZSBwcmVzZXJ2ZSB0aGUgZXhpc3RpbmdcbiAgICogICAgICAgaW5saW5lIGVkaXRhYmxlIERPTS4gVGhpcyBlZmZlY3RpdmVseSByZS1yZW5kZXJzIHRoZSBjb250YWluZXJcbiAgICogICAgICAgd2l0aG91dCB0cmlnZ2VyaW5nIGEgcmUtcmVuZGVyXG4gICAqICAgICAtICdhdHRyaWJ1dGVzJzogUmUtcmVuZGVycyB0aGUgdG9wLWxldmVsIGF0dHJpYnV0ZXMgb25seS5cbiAgICogICAgIC0gJ2FsbCc6IFJlLXJlbmRlcnMgZXZlcnl0aGluZy4gVGhpcyB3aWxsIHdpcGUgb3V0IHRoZSBzdHJ1Y3R1cmUgb2ZcbiAgICogICAgICAgYW55IGV4aXN0aW5nIGVkaXRzIGFuZCBzdWItd2lkZ2V0cywgc28gaXQncyByZWFsbHkgb25seSBzdWl0YWJsZVxuICAgKiAgICAgICB3aGVuIHRoZSBtYXJrdXAgaXMgY29tcGxldGVseSBzdGFsZS4gVXN1YWxseSwgJ2NvbnRhaW5lcicgaXMgYVxuICAgKiAgICAgICBiZXR0ZXIgb3B0aW9uLlxuICAgKiAgIElmIG5vIG1vZGUgaXMgcHJvdmlkZWQgJ2FsbCcgaXMgdXNlZCBieSBkZWZhdWx0LlxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbihtb2RlKSB7XG4gICAgdGhpcy5fZmluZCh0aGlzLmNvbW1hbmRTZWxlY3Rvcikub2ZmKCk7XG5cbiAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgIGNhc2UgJ2R1cGxpY2F0aW5nJzpcbiAgICAgICAgdGhpcy5fcmVuZGVyRHVwbGljYXRpbmcoKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2NvbnRhaW5lcic6XG4gICAgICAgIHRoaXMuX3JlbmRlckNvbnRhaW5lcigpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnYXR0cmlidXRlcyc6XG4gICAgICAgIHRoaXMuX3JlbmRlckF0dHJpYnV0ZXMoKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMuX3JlbmRlckFsbCgpO1xuICAgIH1cblxuICAgIHRoaXMuX2NsZWFudXBTdGFsZUVkaXRhYmxlcygpO1xuICAgIHRoaXMudHJpZ2dlcignRE9NUmVuZGVyJywgdGhpcywgdGhpcy4kZWwpO1xuICAgIHRoaXMudHJpZ2dlcignRE9NTXV0YXRlJywgdGhpcywgdGhpcy4kZWwpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIGFuIGVkaXQgY29tbWFuZCBkaXNwYXRjaC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGVkaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubW9kZWwuZWRpdCgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDbGVhbnMgdXAgdGhlIHZpZXcgYW5kIHRyaWdnZXJzIHRoZSBkZXN0cnVjdGlvbiBvZiB0aGUgYXNzb2NpYXRlZCB3aWRnZXQuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICBpZiAodGhpcy5tb2RlbCkge1xuICAgICAgdGhpcy50cmlnZ2VyKCdET01SZW1vdmUnLCB0aGlzLCB0aGlzLiRlbCk7XG4gICAgICB0aGlzLl9jbGVhbnVwU3RhbGVFZGl0YWJsZXModHJ1ZSk7XG4gICAgICB2YXIgbW9kZWwgPSB0aGlzLm1vZGVsO1xuICAgICAgdGhpcy5tb2RlbCA9IG51bGw7XG4gICAgICBtb2RlbC5kZXN0cm95KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24oKSB7XG4gICAgLy8gQ2xlYW51cCB0aGUgY29tbWFuZCBsaXN0ZW5lcnMuIEBzZWUgX3JlbmRlckNvbW1hbmRzLlxuICAgIHRoaXMuX2ZpbmQodGhpcy5jb21tYW5kU2VsZWN0b3IpLm9mZigpO1xuICAgIHJldHVybiBXaWRnZXRWaWV3LnByb3RvdHlwZS5zdG9wTGlzdGVuaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIGVkaXRvciB2aWV3IGhhcyBiZWVuIHJlbmRlcmVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtib29sfVxuICAgKiAgIFRydWUgaWYgdGhlIGVkaXRvciB2aWV3IGhhcyBiZWVuIHJlbmRlcmVkIG9uIHRoZSByb293IGVsZW1lbnQgb2YgdGhlXG4gICAqICAgdmlldywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgaXNFZGl0b3JWaWV3UmVuZGVyZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLiRlbC5hdHRyKHRoaXMudmlld01vZGVBdHRyaWJ1dGUpID09ICdlZGl0b3InO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW5kZXJzIHRoZSB3aWRnZXQgaW5kaWNhdGluZyB0aGUgZGF0YSBlbnRpdHkgaXMgYmVpbmcgZHVwbGljYXRlZC5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBfcmVuZGVyRHVwbGljYXRpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudHJpZ2dlcignRE9NUmVtb3ZlJywgdGhpcywgdGhpcy4kZWwuY2hpbGRyZW4oKSk7XG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMuX2VsZW1lbnRGYWN0b3J5LCB0aGlzLnByb2Nlc3NpbmdJbmRpY2F0b3IsIHRoaXMuYWN0aW9ucykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW5kZXJzIHRoZSBtYXJrdXAgZm9yIGEgd2lkZ2V0IHdoaWxlIHByZXNlcnZpbmcgdGhlIGlubGluZSBlZGl0YWJsZSBET00uXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgX3JlbmRlckNvbnRhaW5lcjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRvbUVkaXRzID0ge307XG4gICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nKSB7XG4gICAgICBkb21FZGl0c1tjb250ZXh0U3RyaW5nXSA9ICRlbC5jb250ZW50cygpO1xuICAgIH0pO1xuXG4gICAgdmFyICRvbGRDb250YWluZXIgPSAkKCc8ZGl2PjwvZGl2PicpO1xuICAgIHZhciAkbmV3Q29udGFpbmVyID0gJCgnPGRpdj48L2Rpdj4nKTtcbiAgICB2YXIgJG9sZENoaWxkcmVuID0gdGhpcy4kZWwuY2hpbGRyZW4oKTtcbiAgICB0aGlzLiRlbC5hcHBlbmQoJG9sZENvbnRhaW5lcik7XG4gICAgdGhpcy4kZWwuYXBwZW5kKCRuZXdDb250YWluZXIpO1xuXG4gICAgJG9sZENvbnRhaW5lci5hcHBlbmQoJG9sZENoaWxkcmVuKTtcbiAgICAkbmV3Q29udGFpbmVyLmh0bWwodGhpcy50ZW1wbGF0ZSh0aGlzLl9lbGVtZW50RmFjdG9yeSwgdGhpcy5tb2RlbC5nZXQoJ21hcmt1cCcpLCB0aGlzLmFjdGlvbnMpKTsgXG4gICAgdGhpcy5fZmluZCh0aGlzLmlubGluZUVkaXRvclNlbGVjdG9yLCAkb2xkQ29udGFpbmVyKS5hdHRyKHRoaXMuaW5saW5lQ29udGV4dEF0dHJpYnV0ZSwgJycpO1xuXG4gICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcikge1xuICAgICAgdGhpcy5fYWRhcHRlci5hdHRhY2hJbmxpbmVFZGl0aW5nKHRoaXMsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKTtcblxuICAgICAgaWYgKGRvbUVkaXRzW2NvbnRleHRTdHJpbmddKSB7XG4gICAgICAgICRlbC5odG1sKCcnKS5hcHBlbmQoZG9tRWRpdHNbY29udGV4dFN0cmluZ10pO1xuICAgICAgfVxuICAgIH0sICRuZXdDb250YWluZXIpO1xuXG4gICAgdGhpcy4kZWwuYXBwZW5kKCRuZXdDb250YWluZXIuY2hpbGRyZW4oKSk7XG4gICAgdGhpcy50cmlnZ2VyKCdET01SZW1vdmUnLCB0aGlzLCAkb2xkQ29udGFpbmVyKTtcbiAgICAkb2xkQ29udGFpbmVyLnJlbW92ZSgpO1xuICAgICRuZXdDb250YWluZXIucmVtb3ZlKCk7XG5cbiAgICByZXR1cm4gdGhpcy5fcmVuZGVyQXR0cmlidXRlcygpLl9yZW5kZXJDb21tYW5kcygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW5kZXJzIGV2ZXJ5dGhpbmcsIGluZGlzY3JpbWluYXRlbHkgZGVzdHJveSB0aGUgZXhpc3RpbmcgRE9NIChhbmQgZWRpdHMpLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIF9yZW5kZXJBbGw6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudHJpZ2dlcignRE9NUmVtb3ZlJywgdGhpcywgdGhpcy4kZWwuY2hpbGRyZW4oKSk7XG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMuX2VsZW1lbnRGYWN0b3J5LCB0aGlzLm1vZGVsLmdldCgnbWFya3VwJyksIHRoaXMuYWN0aW9ucykpO1xuXG4gICAgdmFyIGVkaXRzID0gdGhpcy5tb2RlbC5nZXQoJ2VkaXRzJyk7XG4gICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcikge1xuICAgICAgaWYgKGVkaXRzW2NvbnRleHRTdHJpbmddKSB7XG4gICAgICAgICRlbC5odG1sKGVkaXRzW2NvbnRleHRTdHJpbmddID8gZWRpdHNbY29udGV4dFN0cmluZ10gOiAnJyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2FkYXB0ZXIuYXR0YWNoSW5saW5lRWRpdGluZyh0aGlzLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcy5fcmVuZGVyQXR0cmlidXRlcygpLl9yZW5kZXJDb21tYW5kcygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZS1yZW5kZXJzIGp1c3QgdGhlIGF0dHJpYnV0ZXMgb24gdGhlIHJvb3QgZWxlbWVudC5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBfcmVuZGVyQXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50RmFjdG9yeS5jcmVhdGUoJ3dpZGdldCcsIHtcbiAgICAgIGNvbnRleHQ6IHRoaXMubW9kZWwuZ2V0KCdjb250ZXh0SWQnKSxcbiAgICAgIHV1aWQ6IHRoaXMubW9kZWwuZ2V0KCdpdGVtSWQnKSxcbiAgICAgIHZpZXdtb2RlOiAnZWRpdG9yJyxcbiAgICB9KTtcblxuICAgIF8uZWFjaChlbGVtZW50LmdldEF0dHJpYnV0ZXMoKSwgZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgIHRoaXMuJGVsLmF0dHIobmFtZSwgdmFsdWUpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdET01NdXRhdGUnLCB0aGlzLCB0aGlzLiRlbCk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogQXR0YWNoZXMgY2xpY2sgaGFuZGxlcnMgZm9yIGZpcmluZyBjb21tYW5kcy5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBfcmVuZGVyQ29tbWFuZHM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2aWV3ID0gdGhpcztcbiAgICB0aGlzLl9maW5kKHRoaXMuY29tbWFuZFNlbGVjdG9yKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhY3Rpb24gPSAkKHRoaXMpLmF0dHIodmlldy5jb21tYW5kQXR0cmlidXRlKTtcbiAgICAgIHZpZXcuYWN0aW9uc1thY3Rpb25dLmNhbGxiYWNrLmNhbGwodmlldyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgY2hhbmdlcyB0byB0aGUgd2lkZ2V0IG1vZGVsIGFuZCBpbnZva2VzIHRoZSBhcHByb3ByaWF0ZSByZW5kZXJlci5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF9jaGFuZ2VIYW5kbGVyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5tb2RlbC5wcmV2aW91cygnZHVwbGljYXRpbmcnKSkge1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5tb2RlbC5nZXQoJ2R1cGxpY2F0aW5nJykpIHtcbiAgICAgIHRoaXMucmVuZGVyKCdkdXBsaWNhdGluZycpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLm1vZGVsLmhhc0NoYW5nZWQoJ21hcmt1cCcpKSB7XG4gICAgICB0aGlzLnJlbmRlcignY29udGFpbmVyJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMubW9kZWwuaGFzQ2hhbmdlZCgnaXRlbUlkJykgfHwgdGhpcy5tb2RlbC5oYXNDaGFuZ2VkKCdjb250ZXh0SWQnKSkge1xuICAgICAgdGhpcy5fcmVuZGVyKCdhdHRyaWJ1dGVzJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlYWN0cyB0byBhIGNvbnRleHQgcmViYXNlIGV2ZW50IGJ5IHVwZGF0aW5nIHRoZSBhc3NvY2lhdGVkIERPTSBlbGVtZW50LlxuICAgKlxuICAgKiBAc2VlIFdpZGdldE1vZGVsXG4gICAqXG4gICAqIEBwYXJhbSB7QmFja2JvbmUuTW9kZWx9IG1vZGVsXG4gICAqICAgVGhlIGNoYW5nZWQgbW9kZWwuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBvbGRJZFxuICAgKiAgIFRoZSBvbGQgY29udGV4dCBpZC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5ld0lkXG4gICAqICAgVGhlIG5ldyBjb250ZXh0IGlkLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIF9yZWJhc2U6IGZ1bmN0aW9uKG1vZGVsLCBvbGRJZCwgbmV3SWQpIHtcbiAgICBpZiAoIW1vZGVsKSB7XG4gICAgICBtb2RlbCA9IHRoaXMubW9kZWw7XG4gICAgfVxuXG4gICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nKSB7XG4gICAgICBpZiAoY29udGV4dFN0cmluZyA9PSBvbGRJZCkge1xuICAgICAgICAkZWwuYXR0cih0aGlzLmlubGluZUNvbnRleHRBdHRyaWJ1dGUsIG5ld0lkKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdET01NdXRhdGUnLCB0aGlzLCAkZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuX3N0YWxlW29sZElkXSA9IHRydWU7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogQWxsb3dzIHRoZSBlZGl0b3IgaW1wbGVtZW50YXRpb24gdG8gZnJlZSBpbmxpbmUgZWRpdGluZyBkYXRhIHN0cnVjdHVyZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbH0gaGFyZFxuICAgKiAgIFdoZXRoZXIgb3Igbm90IHRvIGZvcmNlIGFsbCBpbmxpbmUgZWRpdGFibGVzIHRvIGJlIGRlc3Ryb3llZC4gRGVmYXVsdHNcbiAgICogICB0byBmYWxzZS5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBfY2xlYW51cFN0YWxlRWRpdGFibGVzOiBmdW5jdGlvbihoYXJkKSB7XG4gICAgaWYgKGhhcmQpIHtcbiAgICAgIHRoaXMuX2lubGluZUVsZW1lbnRWaXNpdG9yKGZ1bmN0aW9uKCRlbCwgY29udGV4dElkLCBzZWxlY3Rvcikge1xuICAgICAgICB0aGlzLl9hZGFwdGVyLmRldGFjaElubGluZUVkaXRpbmcodGhpcywgY29udGV4dElkLCBzZWxlY3Rvcik7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBfLmVhY2godGhpcy5fc3RhbGUsIGZ1bmN0aW9uKHVudXNlZCwgY29udGV4dElkKSB7XG4gICAgICAgIHZhciBzZWxlY3RvciA9IHRoaXMuX2lubGluZUVsZW1lbnRTZWxlY3Rvcihjb250ZXh0SWQpO1xuICAgICAgICB0aGlzLl9hZGFwdGVyLmRldGFjaElubGluZUVkaXRpbmcodGhpcywgY29udGV4dElkLCBzZWxlY3Rvcik7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zdGFsZSA9IHt9O1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSB2aWV3IGZvciByZXByZXNlbnRpbmcgdGhlIGV4cG9ydGVkIGRhdGEgc3RhdGUgb2YgYSB3aWRnZXQuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgV2lkZ2V0VmlldyA9IHJlcXVpcmUoJy4vV2lkZ2V0VmlldycpLFxuICB1bmltcGxlbWVudGVkID0gcmVxdWlyZSgnLi4vdW5pbXBsZW1lbnRlZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdpZGdldFZpZXcuZXh0ZW5kKHtcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBXaWRnZXRWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICB0aGlzLmF0dHJpYnV0ZVdoaXRlbGlzdCA9IF8uaW52ZXJ0KHRoaXMud2lkZ2V0VGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZXMoKSk7XG4gICAgZGVsZXRlIHRoaXMuYXR0cmlidXRlV2hpdGVsaXN0W3RoaXMud2lkZ2V0VGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZSgnPHZpZXdtb2RlPicpXTtcbiAgfSxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICpcbiAgICogQHBhcmFtIHtFbGVtZW50RmFjdG9yeX0gZWxlbWVudEZhY3RvcnlcbiAgICogICBUaGUgZmFjdG9yeSB1c2VkIHRvIGNyZWF0ZSBET00gZWxlbWVudCB0ZW1wbGF0ZXMuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHNcbiAgICogICBBIG1hcCBvZiB0aGUgZmllbGQgLyBkYXRhIHN0cnVjdHVyZSBvZiB0aGUgd2lkZ2V0IHRvIG91dHB1dCB0YWdzIGZvci5cbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgb2YgY29udGV4dCBpZHMgdG8gaW5saW5lIGVkaXRzIHRoYXQgaGF2ZSBiZWVuIG1hZGUgZm9yIHRoYXRcbiAgICogICBjb250ZXh0LlxuICAgKi9cbiAgdGVtcGxhdGU6IGZ1bmN0aW9uKGVsZW1lbnRGYWN0b3J5LCBmaWVsZHMsIGVkaXRzKSB7XG4gICAgdW5pbXBsZW1lbnRlZChlbGVtZW50RmFjdG9yeSwgZmllbGRzLCBlZGl0cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2aWV3ID0gdGhpcztcbiAgICB2YXIgZmllbGRzID0gdGhpcy5tb2RlbC5lZGl0QnVmZmVySXRlbVJlZi5lZGl0QnVmZmVySXRlbS5nZXQoJ2ZpZWxkcycpO1xuICAgIHZhciBlZGl0cyA9IHRoaXMubW9kZWwuZ2V0KCdlZGl0cycpO1xuICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSh0aGlzLl9lbGVtZW50RmFjdG9yeSwgZmllbGRzLCBlZGl0cykpO1xuICAgIF8uZWFjaCh0aGlzLmVsLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKGF0dHIpIHtcbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKHZpZXcuYXR0cmlidXRlV2hpdGVsaXN0W2F0dHIubmFtZV0pKSB7XG4gICAgICAgIHZpZXcuJGVsLnJlbW92ZUF0dHIoYXR0ci5uYW1lKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhIG1vZGVsIGZvciByZXByZXNlbnRpbmcgd2lkZ2V0cy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gICQgPSBCYWNrYm9uZS4kLFxuICB1bmltcGxlbWVudGVkID0gcmVxdWlyZSgnLi4vdW5pbXBsZW1lbnRlZCcpO1xuXG4vKipcbiAqIEJhY2tib25lIHZpZXcgZm9yIHJlcHJlc2VudGluZyB3aWRnZXRzIHdpdGhpbiB0aGUgZWRpdG9yLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBhdWdtZW50cyBCYWNrYm9uZS5Nb2RlbFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMuYWRhcHRlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXF1aXJlZCBhZGFwdGVyIG9wdGlvbiBtaXNzaW5nLicpO1xuICAgIH1cblxuICAgIGlmICghb3B0aW9ucy5lbGVtZW50RmFjdG9yeSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXF1aXJlZCBlbGVtZW50RmFjdG9yeSBvcHRpb24gbWlzc2luZy4nKTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMudGVtcGxhdGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUmVxdWlyZWQgdGVtcGxhdGUgb3B0aW9uIG1pc3NpbmcuJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fYWRhcHRlciA9IG9wdGlvbnMuYWRhcHRlcjtcbiAgICB0aGlzLl9lbGVtZW50RmFjdG9yeSA9IG9wdGlvbnMuZWxlbWVudEZhY3Rvcnk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IG9wdGlvbnMudGVtcGxhdGU7XG5cbiAgICAvLyBHZXQgYSBsaXN0IG9mIHRlbXBsYXRlcyB0aGF0IHdpbGwgYmUgdXNlZC5cbiAgICB0aGlzLndpZGdldFRlbXBsYXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ3dpZGdldCcpO1xuICAgIHRoaXMuZmllbGRUZW1wbGF0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCdmaWVsZCcpO1xuICAgIHRoaXMud2lkZ2V0Q29tbWFuZFRlbXBsYXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ3dpZGdldC1jb21tYW5kJyk7XG5cbiAgICAvLyBTZXQgdXAgYXR0cmlidXRlIC8gZWxlbWVudCBzZWxlY3RvcnMuXG4gICAgdGhpcy53aWRnZXRTZWxlY3RvciA9IHRoaXMud2lkZ2V0VGVtcGxhdGUuZ2V0U2VsZWN0b3IoKTtcbiAgICB0aGlzLnZpZXdNb2RlQXR0cmlidXRlID0gdGhpcy53aWRnZXRUZW1wbGF0ZS5nZXRBdHRyaWJ1dGVOYW1lKCc8dmlld21vZGU+Jyk7XG4gICAgdGhpcy5pbmxpbmVDb250ZXh0QXR0cmlidXRlID0gdGhpcy5maWVsZFRlbXBsYXRlLmdldEF0dHJpYnV0ZU5hbWUoJzxjb250ZXh0PicpO1xuICAgIHRoaXMuaW5saW5lRWRpdG9yU2VsZWN0b3IgPSB0aGlzLmZpZWxkVGVtcGxhdGUuZ2V0U2VsZWN0b3IoKTtcbiAgfSxcblxuICAvKipcbiAgICogR2VuZXJhdGVzIHRoZSBIVE1MIGNvbnRlbnQgZm9yIHRoZSByb290IGVsZW1lbnQuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICogICBUaGUgaHRtbCBtYXJrdXAgdG8gYXBwbHkgaW5zaWRlIHRoZSByb290IGVsZW1lbnQuXG4gICAqL1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgdW5pbXBsZW1lbnRlZCgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW5kZXJzIHRoZSB3aWRnZXQuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB1bmltcGxlbWVudGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNhdmVzIGlubGluZSBlZGl0cyBjdXJyZW50bHkgaW4gdGhlIERPTSB0byB0aGUgbW9kZWwuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgc2F2ZTogZnVuY3Rpb24oKSB7XG5cbiAgICBpZiAoIXRoaXMubW9kZWwuZ2V0KCdkdXBsaWNhdGluZycpKSB7XG4gICAgICB2YXIgZWRpdHMgPSB7fTtcbiAgICAgIHRoaXMuX2lubGluZUVsZW1lbnRWaXNpdG9yKGZ1bmN0aW9uKCRlbCwgY29udGV4dFN0cmluZywgc2VsZWN0b3IpIHtcbiAgICAgICAgZWRpdHNbY29udGV4dFN0cmluZ10gPSB0aGlzLl9hZGFwdGVyLmdldElubGluZUVkaXQodGhpcywgY29udGV4dFN0cmluZywgc2VsZWN0b3IpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLm1vZGVsLnNldCh7ZWRpdHM6IGVkaXRzfSwge3NpbGVudDogdHJ1ZX0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICAvLyBXZSBvdmVycmlkZSB0aGUgZGVmYXVsdCByZW1vdmUgZnVuY3Rpb24gdG8gcHJldmVudCBkZXN0cnVjdGlvbiBvZiB0aGVcbiAgICAvLyB3aWRnZXQgYnkgZGVmYXVsdCB3aGVuIHRoZSB2aWV3IGlzIHJlbW92ZWQuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGlubGluZSBlbGVtZW50IHNlbGVjdG9yIGZvciBhIGdpdmVuIGNvbnRleHQgaWQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZXh0SWRcbiAgICogICBUaGUgY29udGV4dCBpZCB0byBnZXQgdGhlIHNlbGVjdG9yIGZvci5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKiAgIEEgalF1ZXJ5IHNlbGVjdG9yIGZvciBhIGdpdmVuIGNvbnRleHRJZC5cbiAgICovXG4gIF9pbmxpbmVFbGVtZW50U2VsZWN0b3I6IGZ1bmN0aW9uKGNvbnRleHRJZCkge1xuICAgIHJldHVybiAnWycgKyB0aGlzLmlubGluZUNvbnRleHRBdHRyaWJ1dGUgKyAnPVwiJyArIGNvbnRleHRJZCArICdcIl0nO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBIHZpc2l0b3IgZnVuY3Rpb24gZm9yIHByb2Nlc3NpbmcgaW5saW5lIGVkaXRhYmxlIGVsZW1lbnRzLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiAgIEEgY2FsbGJhY2sgdGhhdCB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggaW5saW5lIGVsZW1lbnQgaW4gdGhlIERPTSxcbiAgICogICB3aXRoIHRocmVlIGFyZ3VtZW50czpcbiAgICogICAgLSAkZWwge2pRdWVyeX0gVGhlIGlubGluZSBlbGVtZW50LlxuICAgKiAgICAtIGNvbnRleHRJZDogVGhlIGNvbnRleHQgaWQgYXNzb2NpYXRlZCB3aXRoIHRoZSBpbmxpbmUgZWxlbWVudC5cbiAgICogICAgLSBzZWxlY3RvcjogQSBzZWxlY3RvciBmb3IgbG9jYXRpbmcgdGhlIGVsZW1lbnQgaW4gdGhlIERPTS5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRyb290RWxcbiAgICogICBUaGUgcm9vdCBlbGVtZW50IHRvIHNlYXJjaCBmb3IgaW5saW5lIGVkaXRhYmxlcyBpbnNpZGUuIElmIG5vbmUgaXNcbiAgICogICBwcm92aWRlZCwgdGhlIHdpZGdldCByb290IGVsZW1lbnQgaXMgdXNlZCBieSBkZWZhdWx0LlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIF9pbmxpbmVFbGVtZW50VmlzaXRvcjogZnVuY3Rpb24oY2FsbGJhY2ssICRyb290RWwpIHtcbiAgICBpZiAoISRyb290RWwpIHtcbiAgICAgICRyb290RWwgPSB0aGlzLiRlbDtcbiAgICB9XG5cbiAgICB2YXIgdmlldyA9IHRoaXM7XG4gICAgdGhpcy5fZmluZCh0aGlzLmlubGluZUVkaXRvclNlbGVjdG9yLCAkcm9vdEVsKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNvbnRleHRTdHJpbmcgPSAkKHRoaXMpLmF0dHIodmlldy5pbmxpbmVDb250ZXh0QXR0cmlidXRlKTtcbiAgICAgIHZhciBzZWxlY3RvciA9IHZpZXcuX2lubGluZUVsZW1lbnRTZWxlY3Rvcihjb250ZXh0U3RyaW5nKTtcbiAgICAgIGNhbGxiYWNrLmNhbGwodmlldywgJCh0aGlzKSwgY29udGV4dFN0cmluZywgc2VsZWN0b3IpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEEgZmluZCB3cmFwcGVyIGZvciBqUXVlcnkgdGhhdCBzZWFyY2hlcyBvbmx5IHdpdGhpbiB0aGUgY29udGV4dCBvZiB0aGVcbiAgICogd2lkZ2V0IHRoaXMgdmlldyBpcyBhc3NvY2lhdGVkIHdpdGguXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvclxuICAgKiAgIFRoZSBzZWxlY3RvciB0byBzZWFyY2ggd2l0aC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRyb290RWxcbiAgICogICBUaGUgcm9vdCBlbGVtZW50IHRvIHNlYXJjaCBpbnNpZGUuIElmIG5vbmUgaXMgcHJvdmlkZWQsIHRoZSB3aWRnZXQgcm9vdFxuICAgKiAgIGVsZW1lbnQgaXMgdXNlZCBieSBkZWZhdWx0LlxuICAgKlxuICAgKiBAcmV0dXJuIHtqUXVlcnl9XG4gICAqICAgQSBqUXVlcnkgd3JhcHBlciBvYmplY3QgY29udGFpbmluZyBhbnkgbWF0Y2hpbmcgZWxlbWVudHMuXG4gICAqL1xuICBfZmluZDogZnVuY3Rpb24oc2VsZWN0b3IsICRyb290RWwpIHtcbiAgICB2YXIgdmlldyA9IHRoaXM7XG4gICAgdmFyICRyZXN1bHQgPSAkKFtdKTtcblxuICAgIGlmICghJHJvb3RFbCkge1xuICAgICAgJHJvb3RFbCA9IHRoaXMuJGVsO1xuICAgIH1cblxuICAgICRyb290RWwuY2hpbGRyZW4oKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRjaGlsZCA9ICQodGhpcyk7XG4gICAgICBpZiAoJGNoaWxkLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAkcmVzdWx0ID0gJHJlc3VsdC5hZGQoJGNoaWxkKTtcbiAgICAgIH1cbiAgICAgIGlmICghJGNoaWxkLmlzKHZpZXcud2lkZ2V0U2VsZWN0b3IpKSB7XG4gICAgICAgICRyZXN1bHQgPSAkcmVzdWx0LmFkZCh2aWV3Ll9maW5kKHNlbGVjdG9yLCAkY2hpbGQpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiAkcmVzdWx0O1xuICB9LFxuXG59KTtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBuYW1lOiAnZGVmYXVsdCcsXG5cbiAgc2VydmljZVByb3RvdHlwZXM6IHtcbiAgICAnQmluZGVyJzogcmVxdWlyZSgnLi9CaW5kZXInKSxcbiAgICAnQ29tbWFuZEVtaXR0ZXInOiByZXF1aXJlKCcuL0VkaXRvci9Db21tYW5kL0NvbW1hbmRFbWl0dGVyJyksXG4gICAgJ0NvbnRleHRDb2xsZWN0aW9uJzogcmVxdWlyZSgnLi9Db2xsZWN0aW9ucy9Db250ZXh0Q29sbGVjdGlvbicpLFxuICAgICdDb250ZXh0TGlzdGVuZXInOiByZXF1aXJlKCcuL0NvbnRleHQvQ29udGV4dExpc3RlbmVyJyksXG4gICAgJ0NvbnRleHRSZXNvbHZlcic6IHJlcXVpcmUoJy4vQ29udGV4dC9Db250ZXh0UmVzb2x2ZXInKSxcbiAgICAnRWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5JzogcmVxdWlyZSgnLi9FZGl0QnVmZmVyL0VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeScpLFxuICAgICdFZGl0QnVmZmVyTWVkaWF0b3InOiByZXF1aXJlKCcuL0VkaXRCdWZmZXIvRWRpdEJ1ZmZlck1lZGlhdG9yJyksXG4gICAgJ0VkaXRvckNvbGxlY3Rpb24nOiByZXF1aXJlKCcuL0NvbGxlY3Rpb25zL0VkaXRvckNvbGxlY3Rpb24nKSxcbiAgICAnRWxlbWVudEZhY3RvcnknOiByZXF1aXJlKCcuL0VsZW1lbnQvRWxlbWVudEZhY3RvcnknKSxcbiAgICAnU2NoZW1hQ29sbGVjdGlvbic6IHJlcXVpcmUoJy4vQ29sbGVjdGlvbnMvU2NoZW1hQ29sbGVjdGlvbicpLFxuICAgICdTeW5jQWN0aW9uRGlzcGF0Y2hlcic6IHJlcXVpcmUoJy4vU3luY0FjdGlvbi9TeW5jQWN0aW9uRGlzcGF0Y2hlcicpLFxuICAgICdTeW5jQWN0aW9uUmVzb2x2ZXInOiByZXF1aXJlKCcuL1N5bmNBY3Rpb24vU3luY0FjdGlvblJlc29sdmVyJyksXG4gICAgJ1dpZGdldEZhY3RvcnknOiByZXF1aXJlKCcuL0VkaXRvci9XaWRnZXQvV2lkZ2V0RmFjdG9yeScpLFxuICAgICdXaWRnZXRTdG9yZSc6IHJlcXVpcmUoJy4vRWRpdG9yL1dpZGdldC9XaWRnZXRTdG9yZScpLFxuICAgICdXaWRnZXRWaWV3RmFjdG9yeSc6IHJlcXVpcmUoJy4vRWRpdG9yL1dpZGdldC9XaWRnZXRWaWV3RmFjdG9yeScpLFxuICAgICdFZGl0b3JWaWV3JzogcmVxdWlyZSgnLi9WaWV3cy9FZGl0b3JWaWV3JyksXG4gIH0sXG5cbiAgdmlld3M6IHtcbiAgICAnZWRpdG9yJzoge1xuICAgICAgcHJvdG90eXBlOiByZXF1aXJlKCcuL1ZpZXdzL1dpZGdldEVkaXRvclZpZXcnKSxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vVGVtcGxhdGVzL1dpZGdldEVkaXRvclZpZXdUZW1wbGF0ZScpLFxuICAgICAgfVxuICAgIH0sXG4gICAgJ2V4cG9ydCc6IHtcbiAgICAgIHByb3RvdHlwZTogcmVxdWlyZSgnLi9WaWV3cy9XaWRnZXRNZW1lbnRvVmlldycpLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9UZW1wbGF0ZXMvV2lkZ2V0TWVtZW50b1ZpZXdUZW1wbGF0ZScpLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuXG4gIHBsdWdpbnM6IHtcbiAgICBhZGFwdGVyOiB7fSxcbiAgICBwcm90b2NvbDoge30sXG4gIH0sXG5cbiAgZWxlbWVudHM6IHtcbiAgICAnd2lkZ2V0Jzoge1xuICAgICAgdGFnOiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgJ2RhdGEtdXVpZCc6ICc8dXVpZD4nLFxuICAgICAgICAnZGF0YS1jb250ZXh0LWhpbnQnOiAnPGNvbnRleHQ+JyxcbiAgICAgICAgJ2RhdGEtdmlld21vZGUnOiAnPHZpZXdtb2RlPicsXG4gICAgICAgICdjbGFzcyc6ICd3aWRnZXQtYmluZGVyLXdpZGdldCdcbiAgICAgIH0sXG4gICAgICBzZWxlY3RvcjogJy53aWRnZXQtYmluZGVyLXdpZGdldFtkYXRhLWNvbnRleHQtaGludF0nLFxuICAgIH0sXG4gICAgJ2ZpZWxkJzoge1xuICAgICAgdGFnOiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgJ2RhdGEtZmllbGQtbmFtZSc6ICc8bmFtZT4nLFxuICAgICAgICAnZGF0YS1jb250ZXh0JzogJzxjb250ZXh0PicsXG4gICAgICAgICdkYXRhLW11dGFibGUnOiAnPGVkaXRhYmxlPicsXG4gICAgICAgICdjbGFzcyc6ICd3aWRnZXQtYmluZGVyLWZpZWxkJ1xuICAgICAgfSxcbiAgICAgIHNlbGVjdG9yOiAnLndpZGdldC1iaW5kZXItZmllbGRbZGF0YS1tdXRhYmxlPVwidHJ1ZVwiXScsXG4gICAgfSxcbiAgICAnd2lkZ2V0LWRpc3BsYXknOiB7XG4gICAgICB0YWc6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnY2xhc3MnOiAnd2lkZ2V0LWJpbmRlci13aWRnZXRfX2Rpc3BsYXknLFxuICAgICAgfVxuICAgIH0sXG4gICAgJ3Rvb2xiYXInOiB7XG4gICAgICB0YWc6ICd1bCcsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICdjbGFzcyc6ICd3aWRnZXQtYmluZGVyLXRvb2xib3gnLFxuICAgICAgfVxuICAgIH0sXG4gICAgJ3Rvb2xiYXItaXRlbSc6IHtcbiAgICAgIHRhZzogJ2xpJyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItdG9vbGJveF9faXRlbScsXG4gICAgICB9XG4gICAgfSxcbiAgICAnd2lkZ2V0LWNvbW1hbmQnOiB7XG4gICAgICB0YWc6ICdhJyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItY29tbWFuZCcsXG4gICAgICAgICdkYXRhLWNvbW1hbmQnOiAnPGNvbW1hbmQ+JyxcbiAgICAgICAgJ2hyZWYnOiAnIycsXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGRhdGE6IHtcbiAgICBjb250ZXh0OiB7fSxcbiAgICBzY2hlbWE6IHt9LFxuICB9XG59O1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBwYWNrYWdlIGZvciBtYW5hZ2luZyBzZXJ2ZXIgLyBjbGllbnQgZGF0YSBiaW5kaW5nIGZvciBlZGl0b3Igd2lkZ2V0cy4gXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgJCA9IHJlcXVpcmUoJ2pxdWVyeScpO1xuXG4vKipcbiAqIFRoZSB3aWRnZXQtc3luYyBsaWJyYXJ5IGFwcGxpY2F0aW9uIHJvb3Qgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdcbiAqICAgQSBtYXAgb2YgY29uZmlndXJhdGlvbi4gU2VlIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gYXMgYSByZWZlcmVuY2UuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gIGlmICghY29uZmlnKSB7XG4gICAgY29uZmlnID0ge307XG4gIH1cbiAgdGhpcy5faW5pdGlhbGl6ZShjb25maWcpO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMsIHtcblxuICBkZWZhdWx0czogcmVxdWlyZSgnLi9jb25maWcnKSxcblxuICBQbHVnaW5JbnRlcmZhY2U6IHtcbiAgICBFZGl0b3JBZGFwdGVyOiByZXF1aXJlKCcuL1BsdWdpbnMvRWRpdG9yQWRhcHRlcicpLFxuICAgIFN5bmNQcm90b2NvbDogcmVxdWlyZSgnLi9QbHVnaW5zL1N5bmNQcm90b2NvbCcpLFxuICB9LFxuXG4gIC8qKlxuICAgKiBBIGNvbnZlbmllbmNlIGZhY3RvcnkgbWV0aG9kIHRvIGNyZWF0ZSB0aGUgV2lkZ2V0QmluZGVyIGFwcGxpY2F0aW9uIHJvb3QuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdcbiAgICogICBBIG1hcCBvZiBjb25maWd1cmF0aW9uLiBTZWUgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiBhcyBhIHJlZmVyZW5jZS5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0QmluZGVyfVxuICAgKiAgIFRoZSByb290IFdpZGdldEJpbmRlciBsaWJyYXJ5IG9iamVjdC5cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgcmV0dXJuIG5ldyBtb2R1bGUuZXhwb3J0cyhjb25maWcpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgY29weSBvZiB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIGFuZCByZXR1cm5zIGl0LlxuICAgKlxuICAgKiBDYWxsIHRoaXMgbWV0aG9kIHRvIGF2b2lkIGFjY2lkZW50bHkgbWFraW5nIGNoYW5nZXMgdG8gdGhlIGRlZmF1bHRcbiAgICogY29uZmlndXJhdGlvbiBvYmplY3QuXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICogICBBIGNvcHkgb2YgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiBvYmplY3QuXG4gICAqL1xuICBjb25maWc6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBkZWZhdWx0cyA9IG1vZHVsZS5leHBvcnRzLmRlZmF1bHRzO1xuICAgIHZhciBjb25maWcgPSB7fTtcbiAgICBjb25maWcuc2VydmljZVByb3RvdHlwZXMgPSB7fTtcbiAgICBfLmRlZmF1bHRzKGNvbmZpZy5zZXJ2aWNlUHJvdG90eXBlcywgZGVmYXVsdHMuc2VydmljZVByb3RvdHlwZXMpO1xuICAgIGNvbmZpZy52aWV3cyA9IHt9O1xuICAgIF8uZWFjaChkZWZhdWx0cy52aWV3cywgZnVuY3Rpb24oZGVmLCBuYW1lKSB7XG4gICAgICBjb25maWcudmlld3NbbmFtZV0gPSB7IG9wdGlvbnM6IHt9IH07XG4gICAgICBfLmRlZmF1bHRzKGNvbmZpZy52aWV3c1tuYW1lXS5vcHRpb25zLCBkZWYub3B0aW9ucyk7XG4gICAgICBfLmRlZmF1bHRzKGNvbmZpZy52aWV3c1tuYW1lXSwgZGVmKTtcbiAgICB9KTtcbiAgICBjb25maWcucGx1Z2lucyA9IHt9O1xuICAgIF8uZGVmYXVsdHMoY29uZmlnLnBsdWdpbnMsIGRlZmF1bHRzLnBsdWdpbnMpO1xuICAgICQuZXh0ZW5kKHRydWUsIGNvbmZpZy5lbGVtZW50cywgZGVmYXVsdHMuZWxlbWVudHMpO1xuICAgIGNvbmZpZy5kYXRhID0ge307XG4gICAgXy5kZWZhdWx0cyhjb25maWcuZGF0YSwgZGVmYXVsdHMuZGF0YSk7XG4gICAgXy5kZWZhdWx0cyhjb25maWcsIGRlZmF1bHRzKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59KTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGVsZW1lbnQgZmFjdG9yeS5cbiAgICpcbiAgICogQHJldHVybiB7RWxlbWVudEZhY3Rvcnl9XG4gICAqICAgVGhlIGVsZW1lbnQgZmFjdG9yeSB1c2VkIHRvIGNyZWF0ZSBlbGVtZW50IHRlbXBsYXRlcyBhbmQgaW5zdGFuY2VzLlxuICAgKi9cbiAgZ2V0RWxlbWVudEZhY3Rvcnk6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9lbGVtZW50RmFjdG9yeTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgY29udGV4dCBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHtDb250ZXh0Q29sbGVjdGlvbn1cbiAgICogICBUaGUgY29sbGVjdGlvbiBvZiBhbGwgY29udGV4dHMgcmVmZXJlbmNlZCBpbiBldmVyeSBib3VuZCBlZGl0b3IuXG4gICAqL1xuICBnZXRDb250ZXh0czogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbnRleHRDb2xsZWN0aW9uO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBzY2hlbWEgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7U2NoZW1hQ29sbGVjdGlvbn1cbiAgICogICBUaGUgY29sbGVjdGlvbiBvZiBhbGwgc2NoZW1hIG5vZGVzLlxuICAgKi9cbiAgZ2V0U2NoZW1hOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc2NoZW1hQ29sbGVjdGlvbjtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgZWRpdG9yIGNvbGxlY3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm4ge0VkaXRvckNvbGxlY3Rpb259XG4gICAqICAgVGhlIGNvbGxlY3Rpb24gb2YgYWxsIGFzc29jaWF0ZWQgZWRpdG9ycy5cbiAgICovXG4gIGdldEVkaXRvcnM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9lZGl0b3JDb2xsZWN0aW9uO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBzeW5jIGFjdGlvbiBkaXNwYXRjaGVyLlxuICAgKlxuICAgKiBAcmV0dXJuIHtTeW5jQWN0aW9uRGlzcGF0Y2hlcn1cbiAgICogICBUaGUgZGlzcGF0Y2hlciBmb3IgZGlzcGF0Y2hpbmcgZWRpdG9yIGNvbW1hbmRzLlxuICAgKi9cbiAgZ2V0U3luY0FjdGlvbkRpc3BhdGNoZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zeW5jQWN0aW9uRGlzcGF0Y2hlcjtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgc3luYyBhY3Rpb24gcmVzb2x2ZXIuXG4gICAqXG4gICAqIEByZXR1cm4ge1N5bmNBY3Rpb25SZXNvbHZlcn1cbiAgICogICBUaGUgcmVzb2x2ZXIgZm9yIHJlc29sdmluZyBzeW5jIGFjdGlvbiBjb21tYW5kcy5cbiAgICovXG4gIGdldFN5bmNBY3Rpb25SZXNvbHZlcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlcjtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbnMgYSB3aWRnZXQgYmluZGVyIGZvciBhIGdpdmVuIGVkaXRvci5cbiAgICpcbiAgICogVG8gY2xvc2UgdGhlIGJpbmRlciBsYXRlciwgY2FsbCBiaW5kZXIuY2xvc2UoKS5cbiAgICpcbiAgICogQHNlZSBCaW5kZXJcbiAgICpcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlZGl0b3JFbFxuICAgKiAgIFRoZSByb290IGVsZW1lbnQgZm9yIHRoZSBlZGl0b3IuIFRoaXMgbXVzdCBoYXZlIHRoZSBjb250ZXh0IGlkIGF0dGFjaGVkXG4gICAqICAgYXMgYW4gYXR0cmlidXRlIGFjY29yZGluZyB0byB0aGUgJ2ZpZWxkJyB0ZW1wbGF0ZSAnPGNvbnRleHQ+JyBkYXRhIGtleSBuYW1lLlxuICAgKiAgIEJ5IGRlZmF1bHQgdGhpcyBpcyAnZGF0YS1jb250ZXh0Jy5cbiAgICpcbiAgICogQHJldHVybiB7QmluZGVyfVxuICAgKiAgIFRoZSBvcGVuZWQgd2lkZ2V0IGJpbmRlciBmb3IgdGhlIGVkaXRvci5cbiAgICovXG4gIG9wZW46IGZ1bmN0aW9uKCRlZGl0b3JFbCkge1xuICAgICRlZGl0b3JFbC5hZGRDbGFzcygnd2lkZ2V0LWJpbmRlci1vcGVuJyk7XG5cbiAgICB2YXIgZWRpdG9yQ29udGV4dCA9IHRoaXMuX2NyZWF0ZUNvbnRleHRSZXNvbHZlcigpLnJlc29sdmVUYXJnZXRDb250ZXh0KCRlZGl0b3JFbCk7XG4gICAgdmFyIGVkaXRvckNvbnRleHRJZCA9IGVkaXRvckNvbnRleHQgPyBlZGl0b3JDb250ZXh0LmdldCgnaWQnKSA6IG51bGw7XG4gICAgdmFyIGVkaXRvck1vZGVsO1xuICAgIGlmIChlZGl0b3JDb250ZXh0SWQpIHtcbiAgICAgIGlmICghdGhpcy5fZWRpdG9yQ29sbGVjdGlvbi5nZXQoZWRpdG9yQ29udGV4dElkKSkge1xuICAgICAgICB2YXIgY29udGV4dFJlc29sdmVyID0gdGhpcy5fY3JlYXRlQ29udGV4dFJlc29sdmVyKGVkaXRvckNvbnRleHQpO1xuICAgICAgICB2YXIgY29tbWFuZEVtaXR0ZXIgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdDb21tYW5kRW1pdHRlcicsIHRoaXMuX3N5bmNBY3Rpb25EaXNwYXRjaGVyLCBjb250ZXh0UmVzb2x2ZXIpO1xuICAgICAgICB2YXIgZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5ID0gdGhpcy5fY3JlYXRlU2VydmljZSgnRWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5JywgY29udGV4dFJlc29sdmVyLCBjb21tYW5kRW1pdHRlcik7XG5cbiAgICAgICAgLy8gU2V0dXAgYSBjb250ZXh0IGxpc3RlbmVyIGZvciByZWNpZXZpbmcgYnVmZmVyIGl0ZW0gYXJyaXZhbFxuICAgICAgICAvLyBub3RpZmljYXRpb25zLCBhbmQgYSBjb250ZXh0IHJlc29sdmVyIGZvciBkZXRlcm1pbmluZyB3aGljaFxuICAgICAgICAvLyBjb250ZXh0KHMpIGFuIGVsZW1lbnQgaXMgYXNzb2NpYXRlZCB3aXRoLlxuICAgICAgICB2YXIgY29udGV4dExpc3RlbmVyID0gdGhpcy5fY3JlYXRlU2VydmljZSgnQ29udGV4dExpc3RlbmVyJyk7XG4gICAgICAgIGNvbnRleHRMaXN0ZW5lci5hZGRDb250ZXh0KGVkaXRvckNvbnRleHQpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBmYWN0b3JpZXMgZm9yIGdlbmVyYXRpbmcgbW9kZWxzIGFuZCB2aWV3cy5cbiAgICAgICAgdmFyIGFkYXB0ZXIgPSB0aGlzLl9nbG9iYWxTZXR0aW5ncy5wbHVnaW5zLmFkYXB0ZXI7XG4gICAgICAgIGlmICh0eXBlb2YgYWRhcHRlci5jcmVhdGUgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGFkYXB0ZXIgPSBhZGFwdGVyLmNyZWF0ZS5hcHBseShhZGFwdGVyLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIGEgdmlldyBmYWN0b3J5IGZvciBnZW5lcmF0aW5nIHdpZGdldCB2aWV3cy5cbiAgICAgICAgdmFyIHZpZXdGYWN0b3J5ID0gdGhpcy5fY3JlYXRlU2VydmljZSgnV2lkZ2V0Vmlld0ZhY3RvcnknLCB0aGlzLl9lbGVtZW50RmFjdG9yeSwgYWRhcHRlcik7XG4gICAgICAgIGZvciAodmFyIHR5cGUgaW4gdGhpcy5fZ2xvYmFsU2V0dGluZ3Mudmlld3MpIHtcbiAgICAgICAgICB2aWV3RmFjdG9yeS5yZWdpc3Rlcih0eXBlLCB0aGlzLl9nbG9iYWxTZXR0aW5ncy52aWV3c1t0eXBlXSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdXVpZEF0dHJpYnV0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCd3aWRnZXQnKS5nZXRBdHRyaWJ1dGVOYW1lKCc8dXVpZD4nKTtcbiAgICAgICAgdmFyIHdpZGdldEZhY3RvcnkgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdXaWRnZXRGYWN0b3J5JywgY29udGV4dFJlc29sdmVyLCBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnksIHV1aWRBdHRyaWJ1dGUpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhIHRhYmxlIGZvciBzdG9yaW5nIHdpZGdldCBpbnN0YW5jZXMgYW5kIGEgdHJhY2tlciB0cmFja2VyIGZvclxuICAgICAgICAvLyBtYWludGFpbmluZyB0aGUgdGFibGUgYmFzZWQgb24gdGhlIGVkaXRvciBzdGF0ZS5cbiAgICAgICAgdmFyIHdpZGdldFN0b3JlID0gdGhpcy5fY3JlYXRlU2VydmljZSgnV2lkZ2V0U3RvcmUnLCBhZGFwdGVyKTtcblxuICAgICAgICAvLyBDcmVhdGUgYSBtZWRpYXRvciBmb3IgY29udHJvbGxpbmcgaW50ZXJhY3Rpb25zIGJldHdlZW4gdGhlIHdpZGdldFxuICAgICAgICAvLyB0YWJsZSBhbmQgdGhlIGVkaXQgYnVmZmVyLlxuICAgICAgICB2YXIgZWRpdEJ1ZmZlck1lZGlhdG9yID0gdGhpcy5fY3JlYXRlU2VydmljZSgnRWRpdEJ1ZmZlck1lZGlhdG9yJywgZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LCB0aGlzLl9lbGVtZW50RmFjdG9yeSwgY29udGV4dExpc3RlbmVyLCBhZGFwdGVyLCBjb250ZXh0UmVzb2x2ZXIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZWRpdG9yIG1vZGVsIGFuZCByZXR1cm4gaXQgdG8gdGhlIGNhbGxlci5cbiAgICAgICAgZWRpdG9yTW9kZWwgPSBuZXcgdGhpcy5fZ2xvYmFsU2V0dGluZ3Muc2VydmljZVByb3RvdHlwZXMuRWRpdG9yQ29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwoe1xuICAgICAgICAgIGlkOiBlZGl0b3JDb250ZXh0SWQsXG4gICAgICAgIH0sIHtcbiAgICAgICAgICB3aWRnZXRGYWN0b3J5OiB3aWRnZXRGYWN0b3J5LFxuICAgICAgICAgIHZpZXdGYWN0b3J5OiB2aWV3RmFjdG9yeSxcbiAgICAgICAgICB3aWRnZXRTdG9yZTogd2lkZ2V0U3RvcmUsXG4gICAgICAgICAgZWRpdEJ1ZmZlck1lZGlhdG9yOiBlZGl0QnVmZmVyTWVkaWF0b3IsXG4gICAgICAgICAgY29udGV4dDogZWRpdG9yQ29udGV4dCxcbiAgICAgICAgICBjb250ZXh0UmVzb2x2ZXI6IGNvbnRleHRSZXNvbHZlcixcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBlZGl0b3JWaWV3ID0gdGhpcy5fY3JlYXRlU2VydmljZSgnRWRpdG9yVmlldycsIHtcbiAgICAgICAgICBtb2RlbDogZWRpdG9yTW9kZWwsXG4gICAgICAgICAgZWw6ICRlZGl0b3JFbFswXSxcbiAgICAgICAgfSwge1xuICAgICAgICAgIGVsZW1lbnRGYWN0b3J5OiB0aGlzLl9lbGVtZW50RmFjdG9yeSxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX2VkaXRvckNvbGxlY3Rpb24uc2V0KGVkaXRvck1vZGVsKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fY3JlYXRlU2VydmljZSgnQmluZGVyJywgZWRpdG9yVmlldyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeGlzdGluZyBiaW5kZXIgYWxyZWFkeSBvcGVuIGZvciB0aGlzIGVkaXRvciBpbnN0YW5jZS4nKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgdGhlIGluaXRpYWxpemF0aW9uIG9mIG9iamVjdHMgdGhhdCBsaXZlIGF0IHRoZSBhcHBsaWNhdGlvbiByb290LlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnXG4gICAqICAgVGhlIGNvbmZpZyBvYmplY3QgYXMgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF9pbml0aWFsaXplOiBmdW5jdGlvbihjb25maWcpIHtcbiAgICB0aGlzLl9nbG9iYWxTZXR0aW5ncyA9IF8uZGVmYXVsdHMoY29uZmlnLCBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0cyk7XG5cbiAgICB2YXIgcHJvdG9jb2wgPSB0aGlzLl9nbG9iYWxTZXR0aW5ncy5wbHVnaW5zLnByb3RvY29sO1xuICAgIGlmICh0eXBlb2YgcHJvdG9jb2wuY3JlYXRlID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHByb3RvY29sID0gcHJvdG9jb2wuY3JlYXRlLmFwcGx5KHByb3RvY29sLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSB0aGUgYWN0aW9uIGRpc3BhdGNoZXIgLyByZXNvbHV0aW9uIHNlcnZpY2VzIGZvciBoYW5kbGluZyBzeW5jaW5nXG4gICAgLy8gZGF0YSB3aXRoIHRoZSBzZXJ2ZXIuXG4gICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyID0gdGhpcy5fY3JlYXRlU2VydmljZSgnU3luY0FjdGlvblJlc29sdmVyJyk7XG4gICAgdGhpcy5fc3luY0FjdGlvbkRpc3BhdGNoZXIgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdTeW5jQWN0aW9uRGlzcGF0Y2hlcicsIHByb3RvY29sLCB0aGlzLl9zeW5jQWN0aW9uUmVzb2x2ZXIpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSB0b3AgbGV2ZWwgY29sbGVjdGlvbnMgdGhhdCBhcmUgc2hhcmVkIGFjcm9zcyBlZGl0b3IgaW5zdGFuY2VzLlxuICAgIHZhciBlZGl0b3JDb2xsZWN0aW9uID0gdGhpcy5fY3JlYXRlU2VydmljZSgnRWRpdG9yQ29sbGVjdGlvbicpO1xuICAgIHZhciBjb250ZXh0Q29sbGVjdGlvbiA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ0NvbnRleHRDb2xsZWN0aW9uJyk7XG4gICAgdmFyIHNjaGVtYUNvbGxlY3Rpb24gPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdTY2hlbWFDb2xsZWN0aW9uJywgW10sIHtcbiAgICAgIGNvbnRleHRDb2xsZWN0aW9uOiBjb250ZXh0Q29sbGVjdGlvbixcbiAgICAgIGRpc3BhdGNoZXI6IHRoaXMuX3N5bmNBY3Rpb25EaXNwYXRjaGVyLFxuICAgIH0pO1xuICAgIHRoaXMuX2VkaXRvckNvbGxlY3Rpb24gPSBlZGl0b3JDb2xsZWN0aW9uO1xuICAgIHRoaXMuX2NvbnRleHRDb2xsZWN0aW9uID0gY29udGV4dENvbGxlY3Rpb247XG4gICAgdGhpcy5fc2NoZW1hQ29sbGVjdGlvbiA9IHNjaGVtYUNvbGxlY3Rpb247XG5cbiAgICAvLyBTZXQgdXAgdGhlIGNvbGxlY3Rpb25zIHRoYXQgdGhlIHN5bmMgYWN0aW9uIHJlc29sdmVyIHNob3VsZCB3YXRjaCBmb3JcbiAgICAvLyB1cGRhdGVzIHRvLlxuICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5hZGRDb2xsZWN0aW9uKCdjb250ZXh0JywgdGhpcy5fY29udGV4dENvbGxlY3Rpb24pO1xuICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5hZGRDb2xsZWN0aW9uKCdzY2hlbWEnLCB0aGlzLl9zY2hlbWFDb2xsZWN0aW9uKTtcbiAgICB0aGlzLl9zeW5jQWN0aW9uUmVzb2x2ZXIuYWRkQ29sbGVjdGlvbignZWRpdEJ1ZmZlckl0ZW0nLCBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgICByZXR1cm4gY29udGV4dENvbGxlY3Rpb24uZ2V0KGF0dHJpYnV0ZXMuY29udGV4dElkKS5lZGl0QnVmZmVyO1xuICAgIH0pO1xuICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5hZGRDb2xsZWN0aW9uKCd3aWRnZXQnLCBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgICB2YXIgd2lkZ2V0U3RvcmUgPSBlZGl0b3JDb2xsZWN0aW9uLmdldChhdHRyaWJ1dGVzLmVkaXRvckNvbnRleHRJZCkud2lkZ2V0U3RvcmU7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgcmV0dXJuIHdpZGdldFN0b3JlLmdldChpZCkubW9kZWw7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZDogZnVuY3Rpb24oYXR0cmlidXRlcykge1xuICAgICAgICAgIHJldHVybiB3aWRnZXRTdG9yZS5hZGQoYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgYW4gZWxlbWVudCBmYWN0b3J5IHRvIHByb3ZpZGUgYSBnZW5lcmljIHdheSB0byBjcmVhdGUgbWFya3VwLlxuICAgIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gdGhpcy5fY3JlYXRlU2VydmljZSgnRWxlbWVudEZhY3RvcnknLCB0aGlzLl9nbG9iYWxTZXR0aW5ncy5lbGVtZW50cyk7XG5cbiAgICAvLyBMb2FkIGFueSBpbml0aWFsIG1vZGVscy5cbiAgICBpZiAoY29uZmlnLmRhdGEpIHtcbiAgICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5yZXNvbHZlKGNvbmZpZy5kYXRhKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhlbHBlciBmdW5jdGlvbiB0byBjcmVhdGUgYSBjb250ZXh0IHJlc29sdmVyIGZvciBhIGdpdmVuIGVkaXRvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIHtDb250ZXh0fSBlZGl0b3JDb250ZXh0XG4gICAqICAgVGhlIHJvb3QgY29udGV4dCBvZiB0aGUgZWRpdG9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtDb250ZXh0UmVzb2x2ZXJ9XG4gICAqICAgQSBjb250ZXh0IHJlc29sdmVyIHNwZWNpZmljIHRvIHRoZSBwcm92aWRlZCBlZGl0b3IgY29udGV4dC5cbiAgICovXG4gIF9jcmVhdGVDb250ZXh0UmVzb2x2ZXI6IGZ1bmN0aW9uKGVkaXRvckNvbnRleHQpIHtcbiAgICB2YXIgc291cmNlQ29udGV4dEF0dHJpYnV0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCd3aWRnZXQnKS5nZXRBdHRyaWJ1dGVOYW1lKCc8Y29udGV4dD4nKTtcbiAgICB2YXIgdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCdmaWVsZCcpLmdldEF0dHJpYnV0ZU5hbWUoJzxjb250ZXh0PicpO1xuICAgIHJldHVybiB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdDb250ZXh0UmVzb2x2ZXInLCB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbiwgc291cmNlQ29udGV4dEF0dHJpYnV0ZSwgdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZSwgZWRpdG9yQ29udGV4dCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzZXJ2aWNlIGJhc2VkIG9uIHRoZSBjb25maWd1cmVkIHByb3RvdHlwZS5cbiAgICpcbiAgICogU2VydmljZSBuYW1lcyBhcmUgdGhlIHNhbWUgYXMgY2xhc3MgbmFtZXMuIFdlIG9ubHkgc3VwcG9ydCBzZXJ2aWNlcyB3aXRoIHVwXG4gICAqIHRvIGZpdmUgYXJndW1lbnRzXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqICAgVGhlIG5hbWUgb2YgdGhlIHNlcnZpY2UgdG8gYmUgY3JlYXRlZC4gVGhpcyBpcyB0aGUgZGVmYXVsdCBjbGFzcyBuYW1lLlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqICAgVGhlIGNyZWF0ZWQgc2VydmljZS4gTm90ZSB0aGF0IGEgbmV3IHNlcnZpY2Ugd2lsbCBiZSBjcmVhdGVkIGVhY2ggdGltZVxuICAgKiAgIHRoaXMgbWV0aG9kIGlzIGNhbGxlZC4gTm8gc3RhdGljIGNhY2hpbmcgaXMgcGVyZm9ybWVkLlxuICAgKi9cbiAgX2NyZWF0ZVNlcnZpY2U6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAvLyBBbGwgYXJndW1lbnRzIHRoYXQgZm9sbG93IHRoZSAnbmFtZScgYXJndW1lbnQgYXJlIGluamVjdGVkIGFzXG4gICAgLy8gZGVwZW5kZW5jaWVzIGludG8gdGhlIGNyZWF0ZWQgb2JqZWN0LlxuICAgIHZhciBhcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGFyZ3MucHVzaChhcmd1bWVudHNbaV0pO1xuICAgIH1cblxuICAgIC8vIFdlIGV4cGxpY2l0bHkgY2FsbCB0aGUgY29uc3RydWN0b3IgaGVyZSBpbnN0ZWFkIG9mIGRvaW5nIHNvbWUgZmFuY3kgbWFnaWNcbiAgICAvLyB3aXRoIHdyYXBwZXIgY2xhc3NlcyBpbiBvcmRlciB0byBpbnN1cmUgdGhhdCB0aGUgY3JlYXRlZCBvYmplY3QgaXNcbiAgICAvLyBhY3R1YWxseSBhbiBpbnN0YW5jZW9mIHRoZSBwcm90b3R5cGUuXG4gICAgdmFyIHByb3RvdHlwZSA9IHRoaXMuX2dsb2JhbFNldHRpbmdzLnNlcnZpY2VQcm90b3R5cGVzW25hbWVdO1xuICAgIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgcmV0dXJuIG5ldyBwcm90b3R5cGUoKTtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIG5ldyBwcm90b3R5cGUoYXJnc1swXSk7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHJldHVybiBuZXcgcHJvdG90eXBlKGFyZ3NbMF0sIGFyZ3NbMV0pO1xuICAgICAgY2FzZSAzOlxuICAgICAgICByZXR1cm4gbmV3IHByb3RvdHlwZShhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdKTtcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgcmV0dXJuIG5ldyBwcm90b3R5cGUoYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSk7XG4gICAgICBjYXNlIDU6XG4gICAgICAgIHJldHVybiBuZXcgcHJvdG90eXBlKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0sIGFyZ3NbM10sIGFyZ3NbNF0pO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWFsbHksIHlvdSBuZWVkIHRvIGluamVjdCBtb3JlIHRoYW4gZml2ZSBzZXJ2aWNlcz8gQ29uc2lkZXIgZmFjdG9yaW5nICcgKyBuYW1lICsgJyBpbnRvIHNlcGFyYXRlIGNsYXNzZXMuJyk7XG4gICAgfVxuICB9XG5cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIE1hcmtzIGEgbWV0aG9kIGFzIGFuIGludGVyZmFjZSBzdHViLlxuICpcbiAqIEByZXR1cm4ge3ZvaWR9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCBtZXRob2QuJyk7XG59O1xuIl19
