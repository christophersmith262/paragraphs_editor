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

    if (command.edits) {
      ajax.options.data['nestedContexts'] = _.keys(command.edits);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9qcy9zcmMvQnVuZGxlU2VsZWN0b3IuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9qcy9zcmMvV2lkZ2V0QmluZGluZ1Byb3RvY29sLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3IvanMvc3JjL2Zha2VfNmVlYjRmNDcuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9CaW5kZXIuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Db2xsZWN0aW9ucy9Db250ZXh0Q29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbGxlY3Rpb25zL0VkaXRCdWZmZXJJdGVtQ29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbGxlY3Rpb25zL0VkaXRvckNvbGxlY3Rpb24uanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Db2xsZWN0aW9ucy9TY2hlbWFDb2xsZWN0aW9uLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvQ29sbGVjdGlvbnMvV2lkZ2V0Q29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbnRleHQvQ29udGV4dExpc3RlbmVyLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvQ29udGV4dC9Db250ZXh0UmVzb2x2ZXIuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FZGl0QnVmZmVyL0VkaXRCdWZmZXJJdGVtUmVmLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdEJ1ZmZlci9FZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FZGl0QnVmZmVyL0VkaXRCdWZmZXJNZWRpYXRvci5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VkaXRvci9Db21tYW5kL0NvbW1hbmRFbWl0dGVyLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdG9yL1dpZGdldC9XaWRnZXRGYWN0b3J5LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdG9yL1dpZGdldC9XaWRnZXRTdG9yZS5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VkaXRvci9XaWRnZXQvV2lkZ2V0Vmlld0ZhY3RvcnkuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FbGVtZW50L0VsZW1lbnQuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FbGVtZW50L0VsZW1lbnRGYWN0b3J5LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL0NvbnRleHRNb2RlbC5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL01vZGVscy9FZGl0QnVmZmVySXRlbU1vZGVsLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL0VkaXRvck1vZGVsLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL1NjaGVtYU1vZGVsLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL1dpZGdldE1vZGVsLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvUGx1Z2lucy9FZGl0b3JBZGFwdGVyLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvUGx1Z2lucy9TeW5jUHJvdG9jb2wuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9TeW5jQWN0aW9uL1N5bmNBY3Rpb25EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvU3luY0FjdGlvbi9TeW5jQWN0aW9uUmVzb2x2ZXIuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9UZW1wbGF0ZXMvV2lkZ2V0RWRpdG9yVmlld1RlbXBsYXRlLmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvVGVtcGxhdGVzL1dpZGdldE1lbWVudG9WaWV3VGVtcGxhdGUuanMiLCIvVXNlcnMvc21pdGMyL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9WaWV3cy9FZGl0b3JWaWV3LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvVmlld3MvV2lkZ2V0RWRpdG9yVmlldy5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL1ZpZXdzL1dpZGdldE1lbWVudG9WaWV3LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvVmlld3MvV2lkZ2V0Vmlldy5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL2NvbmZpZy5qcyIsIi9Vc2Vycy9zbWl0YzIvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL2luZGV4LmpzIiwiL1VzZXJzL3NtaXRjMi9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvdW5pbXBsZW1lbnRlZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgRHJ1cGFsIEFQSSBpbnRlZ3JhdGlvbnMgZm9yIHBhcmFncmFwaHNfZWRpdG9yLlxuICovXG5cbnZhciBEcnVwYWwgPSByZXF1aXJlKCdkcnVwYWwnKSxcbiAgJCA9IHJlcXVpcmUoJ2pxdWVyeScpO1xuXG5EcnVwYWwuYmVoYXZpb3JzLnBhcmFncmFwaHNfZWRpdG9yX2J1bmRsZXNlbGVjdG9yID0ge1xuICBhdHRhY2g6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAkKCcucGFyYWdyYXBocy1lZGl0b3ItYnVuZGxlLXNlbGVjdG9yLXNlYXJjaCcsIGNvbnRleHQpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGNvbnRhaW5lciA9ICQodGhpcyk7XG4gICAgICB2YXIgJGlucHV0ID0gJGNvbnRhaW5lci5maW5kKCcucGFyYWdyYXBocy1lZGl0b3ItYnVuZGxlLXNlbGVjdG9yLXNlYXJjaF9faW5wdXQnKTtcbiAgICAgIHZhciAkc3VibWl0ID0gJGNvbnRhaW5lci5maW5kKCcucGFyYWdyYXBocy1lZGl0b3ItYnVuZGxlLXNlbGVjdG9yLXNlYXJjaF9fc3VibWl0Jyk7XG5cbiAgICAgICRpbnB1dC5rZXl1cChmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICRzdWJtaXQubW91c2Vkb3duKCk7XG4gICAgICB9KS5ibHVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdmb2N1cycpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsInZhciBEcnVwYWwgPSByZXF1aXJlKCdkcnVwYWwnKSxcbiAgJCA9IHJlcXVpcmUoJ2pxdWVyeScpLFxuICBXaWRnZXRCaW5kZXIgPSByZXF1aXJlKCd3aWRnZXQtYmluZGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gV2lkZ2V0QmluZGVyLlBsdWdpbkludGVyZmFjZS5TeW5jUHJvdG9jb2wuZXh0ZW5kKHtcblxuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obW9kdWxlX25hbWUpIHtcbiAgICB0aGlzLm1vZHVsZU5hbWUgPSBtb2R1bGVfbmFtZTtcbiAgfSxcblxuICBzZW5kOiBmdW5jdGlvbih0eXBlLCBkYXRhLCByZXNvbHZlcikge1xuICAgIGlmICh0eXBlID09ICdGRVRDSF9TQ0hFTUEnKSB7XG4gICAgICB0aGlzLl9nZXQoZGF0YSwgcmVzb2x2ZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX3NlbmRBamF4Q29tbWFuZChkYXRhLCByZXNvbHZlcik7XG4gICAgfVxuICB9LFxuXG4gIF9zZW5kQWpheENvbW1hbmQ6IGZ1bmN0aW9uKGNvbW1hbmQsIHJlc29sdmVyKSB7XG5cbiAgICBpZiAoIWNvbW1hbmQuY29tbWFuZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9ICcvYWpheC9wYXJhZ3JhcGhzLWVkaXRvci8nICsgY29tbWFuZC5jb21tYW5kO1xuXG4gICAgaWYgKGNvbW1hbmQudGFyZ2V0Q29udGV4dCkge1xuICAgICAgcGF0aCArPSAnLycgKyBjb21tYW5kLnRhcmdldENvbnRleHQ7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1hbmQuc291cmNlQ29udGV4dCkge1xuICAgICAgcGF0aCArPSAnLycgKyBjb21tYW5kLnNvdXJjZUNvbnRleHQ7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1hbmQuaXRlbUlkKSB7XG4gICAgICBwYXRoICs9ICcvJyArIGNvbW1hbmQuaXRlbUlkO1xuICAgIH1cblxuICAgIGlmIChjb21tYW5kLndpZGdldCkge1xuICAgICAgcGF0aCArPSAnLycgKyBjb21tYW5kLndpZGdldDtcbiAgICB9XG5cbiAgICBpZiAoY29tbWFuZC50eXBlKSB7XG4gICAgICBwYXRoICs9ICcvJyArIGNvbW1hbmQudHlwZTtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIGNvbW1hbmQuc2V0dGluZ3MpIHtcbiAgICAgIHBhcmFtcy5wdXNoKCdzZXR0aW5nc1snICsga2V5ICsgJ109JyArIGNvbW1hbmQuc2V0dGluZ3Nba2V5XSk7XG4gICAgfVxuICAgIHBhcmFtcy5wdXNoKCdtb2R1bGU9JyArIHRoaXMubW9kdWxlTmFtZSk7XG4gICAgcGF0aCArPSAnPycgKyBwYXJhbXMuam9pbignJicpO1xuXG4gICAgdmFyIGFqYXggPSBEcnVwYWwuYWpheCh7XG4gICAgICB1cmw6IHBhdGgsXG4gICAgICBwcm9ncmVzczoge1xuICAgICAgICBtZXNzYWdlOiBcIlwiLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGFqYXgub3B0aW9ucy5kYXRhWydlZGl0b3JDb250ZXh0J10gPSBjb21tYW5kLmVkaXRvckNvbnRleHQuaWQ7XG5cbiAgICBpZiAoY29tbWFuZC5lZGl0cykge1xuICAgICAgYWpheC5vcHRpb25zLmRhdGFbJ25lc3RlZENvbnRleHRzJ10gPSBfLmtleXMoY29tbWFuZC5lZGl0cyk7XG4gICAgfVxuXG4gICAgdmFyIGNvbXBsZXRlID0gYWpheC5vcHRpb25zLmNvbXBsZXRlO1xuXG4gICAgYWpheC5vcHRpb25zLmNvbXBsZXRlID0gZnVuY3Rpb24gKHhtbGh0dHByZXF1ZXN0LCBzdGF0dXMpIHtcbiAgICAgIGNvbXBsZXRlLmNhbGwoYWpheC5vcHRpb25zLCB4bWxodHRwcmVxdWVzdCwgc3RhdHVzKTtcbiAgICAgIERydXBhbC5hamF4Lmluc3RhbmNlcy5zcGxpY2UoYWpheC5pbnN0YW5jZUluZGV4LCAxKTtcbiAgICB9XG5cbiAgICBhamF4LmV4ZWN1dGUoKTtcbiAgfSxcblxuICBfZ2V0OiBmdW5jdGlvbihpZCwgcmVzb2x2ZXIpIHtcbiAgICAkLmdldCgnL2FqYXgvcGFyYWdyYXBocy1lZGl0b3Ivc2NoZW1hLycgKyBpZCwgJycsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICByZXNvbHZlci5yZXNvbHZlKHJlc3BvbnNlKTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBEcnVwYWwgQVBJIGludGVncmF0aW9ucyBmb3IgcGFyYWdyYXBoc19lZGl0b3IuXG4gKi9cblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIERydXBhbCA9IHJlcXVpcmUoJ2RydXBhbCcpLFxuICBkcnVwYWxTZXR0aW5ncyA9IHJlcXVpcmUoJ2RydXBhbC1zZXR0aW5ncycpLFxuICAkID0gcmVxdWlyZSgnanF1ZXJ5JyksXG4gIFdpZGdldEJpbmRpbmdQcm90b2NvbCA9IHJlcXVpcmUoJy4vV2lkZ2V0QmluZGluZ1Byb3RvY29sJyk7XG4gIFdpZGdldEJpbmRlciA9IHJlcXVpcmUoJ3dpZGdldC1iaW5kZXInKTtcblxucmVxdWlyZSgnLi9CdW5kbGVTZWxlY3RvcicpO1xuXG4vKipcbiAqIHtAbmFtZXNwYWNlfVxuICovXG5EcnVwYWwucGFyYWdyYXBoc19lZGl0b3IgPSB7fTtcblxuLyoqXG4gKiBDb21tYW5kIHRvIHByb2Nlc3MgcmVzcG9uc2UgZGF0YSBmcm9tIHBhcmFncmFwaHMgZWRpdG9yIGNvbW1hbmRzLlxuICpcbiAqIEBwYXJhbSB7RHJ1cGFsLkFqYXh9IFthamF4XVxuICogICB7QGxpbmsgRHJ1cGFsLkFqYXh9IG9iamVjdCBjcmVhdGVkIGJ5IHtAbGluayBEcnVwYWwuYWpheH0uXG4gKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2VcbiAqICAgVGhlIHJlc3BvbnNlIGZyb20gdGhlIEFqYXggcmVxdWVzdC5cbiAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZS5pZFxuICogICBUaGUgbW9kZWwgaWQgZm9yIHRoZSBjb21tYW5kIHRoYXQgd2FzIHVzZWQuXG4gKi9cbkRydXBhbC5BamF4Q29tbWFuZHMucHJvdG90eXBlLnBhcmFncmFwaHNfZWRpdG9yX2RhdGEgPSBmdW5jdGlvbihhamF4LCByZXNwb25zZSwgc3RhdHVzKXtcbiAgdmFyIG1vZHVsZV9uYW1lID0gcmVzcG9uc2UubW9kdWxlO1xuICBkZWxldGUgcmVzcG9uc2UubW9kdWxlO1xuICBEcnVwYWwucGFyYWdyYXBoc19lZGl0b3IuaW5zdGFuY2VzW21vZHVsZV9uYW1lXS5nZXRTeW5jQWN0aW9uUmVzb2x2ZXIoKS5yZXNvbHZlKHJlc3BvbnNlKTtcbn1cblxuLyoqXG4gKiBUaGVtZSBmdW5jdGlvbiBmb3IgZ2VuZXJhdGluZyBwYXJhZ3JhcGhzIGVkaXRvciB3aWRnZXRzLlxuICpcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqICAgQSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgRE9NIGZyYWdtZW50LlxuICovXG5EcnVwYWwudGhlbWUucGFyYWdyYXBoc0VkaXRvcldpZGdldCA9IGZ1bmN0aW9uKGVsZW1lbnRGYWN0b3J5LCBtYXJrdXAsIGFjdGlvbnMpIHtcbiAgXy5lYWNoKGFjdGlvbnMsIGZ1bmN0aW9uKGRlZiwgaWQpIHtcbiAgICBkZWYudGl0bGUgPSBEcnVwYWwudChkZWYudGl0bGUpO1xuICB9KTtcbiAgcmV0dXJuIFdpZGdldEJpbmRlci5kZWZhdWx0cy52aWV3c1snZWRpdG9yJ10ub3B0aW9ucy50ZW1wbGF0ZShlbGVtZW50RmFjdG9yeSwgbWFya3VwLCBhY3Rpb25zKTtcbn1cblxuLyoqXG4gKiBUaGVtZSBmdW5jdGlvbiBmb3IgZ2VuZXJhdGluZyBwYXJhZ3JhcGhzIGVkaXRvciB3aWRnZXRzLlxuICpcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqICAgQSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgRE9NIGZyYWdtZW50LlxuICovXG5EcnVwYWwudGhlbWUucGFyYWdyYXBoc0VkaXRvckV4cG9ydCA9IGZ1bmN0aW9uKGVsZW1lbnRGYWN0b3J5LCBmaWVsZHMsIGVkaXRzKSB7XG4gIHJldHVybiBXaWRnZXRCaW5kZXIuZGVmYXVsdHMudmlld3NbJ2V4cG9ydCddLm9wdGlvbnMudGVtcGxhdGUoZWxlbWVudEZhY3RvcnksIGZpZWxkcywgZWRpdHMpO1xufVxuXG5EcnVwYWwucGFyYWdyYXBoc19lZGl0b3IuaW5zdGFuY2VzID0ge307XG5cbkRydXBhbC5wYXJhZ3JhcGhzX2VkaXRvci5yZWdpc3RlciA9IGZ1bmN0aW9uKG1vZHVsZV9uYW1lLCBhZGFwdGVyKSB7XG4gIHZhciBjb25maWcgPSBXaWRnZXRCaW5kZXIuY29uZmlnKCk7XG5cbiAgY29uZmlnLnBsdWdpbnMgPSB7XG4gICAgYWRhcHRlcjogYWRhcHRlcixcbiAgICBwcm90b2NvbDogbmV3IFdpZGdldEJpbmRpbmdQcm90b2NvbChtb2R1bGVfbmFtZSksXG4gIH07XG5cbiAgY29uZmlnLmVsZW1lbnRzLndpZGdldCA9IHtcbiAgICB0YWc6ICdwYXJhZ3JhcGgnLFxuICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICdkYXRhLXV1aWQnOiAnPHV1aWQ+JyxcbiAgICAgICdkYXRhLWNvbnRleHQtaGludCc6ICc8Y29udGV4dD4nLFxuICAgICAgJ2RhdGEtdmlld21vZGUnOiAnPHZpZXdtb2RlPicsXG4gICAgfSxcbiAgICBzZWxlY3RvcjogJ3BhcmFncmFwaFtkYXRhLWNvbnRleHQtaGludF0nXG4gIH07XG5cbiAgY29uZmlnLmVsZW1lbnRzLmZpZWxkID0ge1xuICAgIHRhZzogJ3BhcmFncmFwaC1maWVsZCcsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgJ2RhdGEtZmllbGQtbmFtZSc6ICc8bmFtZT4nLFxuICAgICAgJ2RhdGEtY29udGV4dCc6ICc8Y29udGV4dD4nLFxuICAgICAgJ2RhdGEtbXV0YWJsZSc6ICc8ZWRpdGFibGU+JyxcbiAgICB9LFxuICAgIHNlbGVjdG9yOiAncGFyYWdyYXBoLWZpZWxkW2RhdGEtbXV0YWJsZT1cInRydWVcIl0sLmVkaXRhYmxlLXBhcmFncmFwaC1maWVsZCcsXG4gIH07XG5cbiAgY29uZmlnLnZpZXdzWydlZGl0b3InXS5vcHRpb25zLnRlbXBsYXRlID0gRHJ1cGFsLnRoZW1lLnBhcmFncmFwaHNFZGl0b3JXaWRnZXQ7XG4gIGNvbmZpZy52aWV3c1snZXhwb3J0J10ub3B0aW9ucy50ZW1wbGF0ZSA9IERydXBhbC50aGVtZS5wYXJhZ3JhcGhzRWRpdG9yRXhwb3J0O1xuXG4gIGNvbmZpZy5kYXRhID0gZHJ1cGFsU2V0dGluZ3MucGFyYWdyYXBoc19lZGl0b3I7XG5cbiAgcmV0dXJuIHRoaXMuaW5zdGFuY2VzW21vZHVsZV9uYW1lXSA9IG5ldyBXaWRnZXRCaW5kZXIoY29uZmlnKTtcbn1cblxuRHJ1cGFsLnBhcmFncmFwaHNfZWRpdG9yLldpZGdldEJpbmRlciA9IFdpZGdldEJpbmRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgV2lkZ2V0TW9kZWwgPSByZXF1aXJlKCcuL01vZGVscy9XaWRnZXRNb2RlbCcpO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBiaW5kZXIgaW5zdGFuY2UuXG4gKlxuICogRWFjaCBiaW5kZXIgaW5zdGFuY2Ugc2hvdWxkIGJlIGFzc29jaWF0ZWQgd2l0aCBleGFjdGx5IG9uZSBlZGl0b3IgaW5zdGFuY2UuXG4gKlxuICogVGhpcyBvYmplY3Qgc2hvdWxkIG5vdCBiZSBjcmVhdGVkIGRpcmVjdGx5LiBUbyBjcmVhdGUgYmluZGVyczpcbiAqXG4gKiBAY29kZVxuICogcmVxdWlyZSgnd2lkZ2V0LWJpbmRlcicpLm9wZW4oJGVkaXRvckVsZW1lbnQpO1xuICogQGVuZGNvZGVcbiAqXG4gKiBUaGUgYmluZGVyIGNvdXBsZXMgYWxsIHRoZSBvYmplY3RzIG5lZWRlZCB0byB0cmFjayB3aWRnZXQgZGF0YSBhbmQgcGVyZm9ybVxuICogZG93bnN0cmVhbSBzeW5jaHJvbml6YXRpb24gZnJvbSB0aGUgc2VydmVyLlxuICpcbiAqIFdpZGdldCBMaWZlY3ljbGU6XG4gKlxuICogICBDcmVhdGU6XG4gKiAgICAgV2hlbiBhIHdpZGdldCBpcyBjcmVhdGVkIGl0IHNob3VsZCBjYWxsIHRoZSAnYmluZCcgbWV0aG9kIG9uIHRoZSBiaW5kZXJcbiAqICAgICB0byBpbnN0cnVjdCB0aGUgYmluZGVyIHRvIHN0YXJ0IHRyYWNraW5nIHRoZSB3aWRnZXQuIFRoaXMgYmluZHMgdGhlXG4gKiAgICAgZWRpdG9yIHdpZGdldCB0byBhIHNlcnZlciBzaWRlIGRhdGEgbW9kZWwgYW5kIHJlbmRlcnMgdGhlIHdpZGdldCB1c2luZ1xuICogICAgIHRoYXQgbW9kZWwuIEl0IGFsc28gYXR0YWNoZXMgYWN0aW9ucyB0byB0aGUgd2lkZ2V0IHRoYXQgdXNlcnMgbWF5XG4gKiAgICAgcGVyZm9ybSwgYW5kIHNldHMgdXAgaW5saW5lIGVkaXRpbmcuXG4gKlxuICogICBFZGl0OlxuICogICAgIFdoZW4gYW4gZWRpdCBhY3Rpb24gaXMgcmVxdWVzdGVkLCB0aGUgc3luYyBwcm90b2NvbCByZXF1ZXN0cyB0aGF0IHRoZVxuICogICAgIHNlcnZlciBhbGxvdyB0aGUgdXNlciB0byBlZGl0IHdpZGdldCdzIGFzc29jaWF0ZWQgZGF0YSBlbnRpdHkgbW9kZWwuIElmXG4gKiAgICAgdGhlIG1hcmt1cCBjaGFuZ2VzLCB0aGUgd2lkZ2V0IGlzIHJlLXJlbmRlcmVkIGFuZCBleGlzdGluZyBpbmxpbmUgZWRpdHNcbiAqICAgICBhcmUgcHJlc2VydmVkLlxuICpcbiAqICAgRHVwbGljYXRlOlxuICogICAgIFNpbmNlIGVhY2ggd2lkZ2V0IGlzIGJvdW5kIHRvIGEgdW5pcXVlIGRhdGEgZW50aXR5IG9uIHRoZSBzZXJ2ZXIsXG4gKiAgICAgb3BlcmF0aW9ucyBsaWtlIGNvcHkgYW5kIHBhc3RlLCBvciBtb3ZpbmcgYSB3aWRnZXQgdG8gYSBkaWZmZXJlbnQgcGFydFxuICogICAgIG9mIHRoZSBkb2N1bWVudCBtYXkgcmVzdWx0IGluIHRoZSB3aWRnZXQncyBhc3NvY2lhdGVkIGRhdGEgZW50aXR5IGJlaW5nXG4gKiAgICAgZHVwbGljYXRlZCBvbiB0aGUgc2VydmVyLiBJZiB0aGlzIG9jY3VycywgdGhlIHdpZGdldCB3aWxsIGJlIHJlLXJlbmRlcmVkXG4gKiAgICAgd2l0aCBpdHMgbmV3IHJlZmVyZW5jZXMsIGFnYWluIHByZXNlcnZpbmcgaW5saW5lIGVkaXRzLlxuICpcbiAqICAgRXhwb3J0OlxuICogICAgIFdoZW4gdGhlIGNvbnRlbnQgYXV0aG9yIGlzIGZpbmlzaGVkIGVkaXRpbmcsIHRoZSBlZGl0b3IgcGVyZm9ybSBjbGVhbnVwXG4gKiAgICAgb24gdGhlIG1hcmt1cC4gQXMgYSBwYXJ0IG9mIHRoaXMgXCJjbGVhbnVwXCIsIHRoZSBjbGllbnQgY2FsbHMgdGhlICdzYXZlJ1xuICogICAgIG1ldGhvZCB0byBnZW5lcmF0ZSB0aGUgXCJleHBvcnQgbWFya3VwXCIsIHdoaWNoIGlzIHdoYXQgd2lsbCBnZXQgc2VudCB0b1xuICogICAgIHRoZSBzZXJ2ZXIuXG4gKlxuICogICBEZXN0cm95OlxuICogICAgIFdoZW4gYSB3aWRnZXQgaXMgZGVzdHJveWVkIGluIHRoZSBlZGl0b3IsIHRoZSBjbGllbnQgY2FsbHMgdGhlICdkZXN0cm95J1xuICogICAgIG1ldGhvZCB0byB1bmJpbmQgYW5kIGZyZWUgYWxsIHJlZmVyZW5jZXMgdG8gdGhlIHdpZGdldC5cbiAqXG4gKiBAcGFyYW0ge0JhY2tib25lLlZpZXd9IGVkaXRvclZpZXdcbiAqICAgVGhlIHZpZXcgdGhhdCB3aWxsIGJlIHVzZWQgdG8ga2VlcCB0aGUgZWRpdG9yIHJvb3QgZWxlbWVudCBpbiBzeW5jLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVkaXRvclZpZXcpIHtcbiAgdGhpcy5fZWRpdG9yVmlldyA9IGVkaXRvclZpZXc7XG4gIHRoaXMuX3dpZGdldEZhY3RvcnkgPSBlZGl0b3JWaWV3Lm1vZGVsLndpZGdldEZhY3Rvcnk7XG4gIHRoaXMuX3ZpZXdGYWN0b3J5ID0gZWRpdG9yVmlldy5tb2RlbC52aWV3RmFjdG9yeTtcbiAgdGhpcy5fd2lkZ2V0U3RvcmUgPSBlZGl0b3JWaWV3Lm1vZGVsLndpZGdldFN0b3JlO1xuICB0aGlzLl9lZGl0QnVmZmVyTWVkaWF0b3IgPSBlZGl0b3JWaWV3Lm1vZGVsLmVkaXRCdWZmZXJNZWRpYXRvcjtcbiAgdGhpcy5fY29udGV4dFJlc29sdmVyID0gZWRpdG9yVmlldy5tb2RlbC5jb250ZXh0UmVzb2x2ZXI7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuXG4gIC8qKlxuICAgKiBSZXF1ZXN0cyB0aGF0IGEgbmV3IHdpZGdldCBiZSBpbnNlcnRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXRFbFxuICAgKiAgIFRoZSBlbGVtZW50IHRoYXQgdGhlIG5ldyB3aWRnZXQgd2lsbCBiZSBpbnNlcnRlZCBpbnRvLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgKiAgIFRoZSB0eXBlIG9mIHRoZSBpdGVtIHRvIHJlcXVlc3QuIFRoaXMgcGFyYW1ldGVyIGlzIG9wdGlvbmFsLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbigkdGFyZ2V0RWwsIHR5cGUpIHtcbiAgICB0aGlzLl9lZGl0QnVmZmVyTWVkaWF0b3IucmVxdWVzdEJ1ZmZlckl0ZW0odHlwZSwgJHRhcmdldEVsKTtcbiAgfSxcblxuICAvKipcbiAgICogTWFrZXMgd2lkZ2V0IG1hbmFnZXIgYXdhcmUgb2YgYSBuZXdseSBpbnNlcnRlZCB3aWRnZXQuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIG1vc3QgaW1wb3J0YW50IG1ldGhvZCBoZXJlLiBJdCBpcyBjYWxsZWQgd2hlbiBhIG5ldyB3aWRnZXQgaXNcbiAgICogY3JlYXRlZCBpbiB0aGUgZWRpdG9yIGluIG9yZGVyIHRvIGluc3RydWN0IHRoZSBtYW5hZ2VyIHRvIHN0YXJ0IHRyYWNraW5nXG4gICAqIHRoZSBsaWZlY3ljbGUgb2YgdGhlIHdpZGdldCwgaXRzIGRvbSByZXByZXNlbnRhdGlvbiwgYW5kIHRoZSBlZGl0IGJ1ZmZlclxuICAgKiBkYXRhIGl0ZW0gaXQgcmVmZXJlbmNlcy5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gd2lkZ2V0XG4gICAqICAgVGhlIGVkaXRvciByZXByZXNlbnRhdGlvbiBvZiBhIHdpZGdldC4gVGhpcyBjYW4gYmUgYW55IGRhdGEgeW91IHdhbnQgdG9cbiAgICogICBhc3NvY2lhdGUgd2l0aCB0aGUgd2lkZ2V0LCBidXQgd2lsbCB1c3VhbGx5IGJlIGFuIG9iamVjdCBnZW5lcmF0ZWQgYnkgdGhlXG4gICAqICAgZWRpdG9yLiBUaGlzIHdpbGwgYmUgYXZhaWxhYmxlIHRvIHRoZSBlZGl0b3IgYWRhcHRlciBkdXJpbmcgd2lkZ2V0XG4gICAqICAgb3BlcmF0aW9ucy5cbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBBIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgd2lkZ2V0LiBUaGlzIHdpbGwgdXN1YWxseSBiZSBnZW5lcmF0ZWQgYnkgdGhlXG4gICAqICAgZWRpdG9yLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldEVsXG4gICAqICAgVGhlIHJvb3QgZWxlbWVudCBvZiB0aGUgd2lkZ2V0IHdpdGhpbiB0aGUgZWRpdG9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRNb2RlbH1cbiAgICogICBUaGUgYm91bmQgbW9kZWwuXG4gICAqL1xuICBiaW5kOiBmdW5jdGlvbih3aWRnZXQsIGlkLCAkdGFyZ2V0RWwpIHtcbiAgICAvLyBDcmVhdGUgYSBtb2RlbCBmb3IgcmVwcmVzZW50aW5nIHRoZSB3aWRnZXQuXG4gICAgdmFyIHdpZGdldE1vZGVsID0gdGhpcy5fd2lkZ2V0RmFjdG9yeS5jcmVhdGUod2lkZ2V0LCBpZCwgJHRhcmdldEVsKTtcbiAgICB2YXIgdGFyZ2V0Q29udGV4dCA9IHdpZGdldE1vZGVsLmVkaXRCdWZmZXJJdGVtUmVmLnRhcmdldENvbnRleHQ7XG4gICAgdmFyIHNvdXJjZUNvbnRleHQgPSB3aWRnZXRNb2RlbC5lZGl0QnVmZmVySXRlbVJlZi5zb3VyY2VDb250ZXh0O1xuXG4gICAgLy8gQ3JlYXRlIGEgd2lkZ2V0IHZpZXcgdG8gcmVuZGVyIHRoZSB3aWRnZXQgd2l0aGluIEVkaXRvci5cbiAgICB2YXIgd2lkZ2V0RWRpdG9yVmlldyA9IHRoaXMuX3ZpZXdGYWN0b3J5LmNyZWF0ZSh3aWRnZXRNb2RlbCwgJHRhcmdldEVsLCAnZWRpdG9yJyk7XG5cbiAgICAvLyBBZGQgdGhlIHdpZGdldCB0byB0aGUgd2lkZ2V0IHRvIHRoZSB0YWJsZSB0byBrZWVwIHRyYWNrIG9mIGl0LlxuICAgIHRoaXMuX3dpZGdldFN0b3JlLmFkZCh3aWRnZXRNb2RlbCwgd2lkZ2V0RWRpdG9yVmlldyk7XG5cbiAgICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxpbmcuXG4gICAgdGhpcy50cmlnZ2VyKCdiaW5kJywgdGhpcywgd2lkZ2V0TW9kZWwsIHdpZGdldEVkaXRvclZpZXcpO1xuXG4gICAgdGhpcy5saXN0ZW5Ubyh3aWRnZXRNb2RlbCwgJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHdpZGdldE1vZGVsLmhhc1N0YXRlKFdpZGdldE1vZGVsLlN0YXRlLkRFU1RST1lFRF9SRUZTKSkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3VuYmluZCcsIHRoaXMsIHdpZGdldE1vZGVsLCB3aWRnZXRFZGl0b3JWaWV3KTtcbiAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKHdpZGdldE1vZGVsKTtcbiAgICAgIH1cbiAgICAgIGlmICh3aWRnZXRNb2RlbC5oYXNTdGF0ZShXaWRnZXRNb2RlbC5TdGF0ZS5ERVNUUk9ZRURfV0lER0VUKSkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Rlc3Ryb3knLCB0aGlzLCB3aWRnZXRNb2RlbCwgd2lkZ2V0RWRpdG9yVmlldyk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICB0aGlzLmxpc3RlblRvKHdpZGdldE1vZGVsLCAnc2F2ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50cmlnZ2VyKCdzYXZlJywgdGhpcywgd2lkZ2V0TW9kZWwsIHdpZGdldEVkaXRvclZpZXcpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy8gSWYgdGhlIHdpZGdldCBpcyBub3QgY3VycmVudGx5IHVzaW5nIHRoZSBlZGl0b3IgdmlldyBtb2RlLCB3ZSB0cmVhdFxuICAgIC8vIGl0IGFzIGJlaW5nIGluICdleHBvcnQnIGZvcm0uIFRoaXMgbWVhbnMgd2UgaGF2ZSB0byBjcmVhdGUgYW4gZXhwb3J0XG4gICAgLy8gdmlldyB0byBsb2FkIHRoZSBkYXRhLlxuICAgIGlmICghd2lkZ2V0RWRpdG9yVmlldy5pc0VkaXRvclZpZXdSZW5kZXJlZCgpKSB7XG4gICAgICB0aGlzLl92aWV3RmFjdG9yeS5jcmVhdGVUZW1wb3Jhcnkod2lkZ2V0TW9kZWwsICR0YXJnZXRFbCwgJ2V4cG9ydCcpLnNhdmUoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB3aWRnZXRFZGl0b3JWaWV3LnNhdmUoKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHdpZGdldCByZWZlcmVuY2luZyB0aGUgc2FtZSBidWZmZXIgaXRlbSB3ZVxuICAgIC8vIG5lZWQgdG8gZHVwbGljYXRlIGl0LiBPbmx5IG9uZSB3aWRnZXQgY2FuIGV2ZXIgcmVmZXJlbmNlIGEgZ2l2ZW5cbiAgICAvLyBidWZmZXIgaXRlbS4gQWRkaXRpb25hbGx5LCBpZiB0aGUgc291cmNlIGNvbnRleHQgaXMgbm90IHRoZSBzYW1lIGFzIHRoZVxuICAgIC8vIHRhcmdldCBjb250ZXh0IHdlIG5lZWQgdG8gZHVwbGljYXRlLiBBIGNvbnRleHQgbWlzbWF0Y2ggZXNzZW50aWFsbHlcbiAgICAvLyBtZWFucyBzb21ldGhpbmcgd2FzIGNvcGllZCBmcm9tIGFub3RoZXIgZmllbGQgaW5zdGFuY2UgaW50byB0aGlzIGZpZWxkXG4gICAgLy8gaW5zdGFuY2UsIHNvIGFsbCB0aGUgZGF0YSBhYm91dCBpdCBpcyBpbiB0aGUgb3JpZ2luYWwgZmllbGQgaW5zdGFuY2UuXG4gICAgdmFyIG1hdGNoaW5nQ29udGV4dHMgPSBzb3VyY2VDb250ZXh0LmdldCgnaWQnKSA9PT0gdGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyk7XG4gICAgaWYgKHRoaXMuX3dpZGdldFN0b3JlLmNvdW50KHdpZGdldE1vZGVsKSA+IDEgfHwgIW1hdGNoaW5nQ29udGV4dHMpIHtcbiAgICAgIHdpZGdldE1vZGVsLmR1cGxpY2F0ZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHdpZGdldEVkaXRvclZpZXcucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdpZGdldE1vZGVsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBVbmJpbmRzIChzdG9wcyB0cmFrY2luZykgYSB3aWRnZXQgd2l0aG91dCBkZXN0cm95aW5nIHRoZSB3aWRnZXQgaXRzZWxmLlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgd2lkZ2V0IHRvIGJlIHVuYm91bmQuXG4gICAqXG4gICAqIEByZXR1cm4ge1dpZGdldE1vZGVsfVxuICAgKiAgIFRoZSBzYXZlZCBtb2RlbCBvciB1bmRlZmluZWQgaWYgbm8gc3VjaCBtb2RlbCB3YXMgZm91bmQuXG4gICAqL1xuICB1bmJpbmQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FwcGx5VG9Nb2RlbChpZCwgZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICAgIHRoaXMuX3dpZGdldFN0b3JlLnJlbW92ZSh3aWRnZXRNb2RlbCwgdHJ1ZSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgYW4gZXhpc3Rpbmcgd2lkZ2V0LlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIFRoZSB3aWRnZXQgaWQgdG8gbG9va3VwLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRNb2RlbH1cbiAgICogICBBIHdpZGdldCBtb2RlbCBpZiB0aGUgaWQgZXhpc3RlZCBpbiB0aGUgc3RvcmUsIG9yIHVuZGVmaW5lZCBvdGhlcndpc2UuXG4gICAqL1xuICBnZXQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZGdldFN0b3JlLmdldChpZCwgdHJ1ZSkubW9kZWw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlcXVlc3RzIGFuIGVkaXQgb3BlcmF0aW9uIGZvciBhIHdpZGdldCdzIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbS5cbiAgICpcbiAgICogVGhpcyB0cmlnZ2VycyBhbiAnZWRpdCcgY29tbWFuZCBmb3IgdGhlIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbS4gSXQnc1xuICAgKiB1cCB0byB0aGUgc3luYyBwcm90Y29sIHBsdWdpbiwgYW5kIGFzc29jaWF0ZWQgbG9naWMgdG8gZGV0ZXJtaW5lIGhvdyB0b1xuICAgKiBoYW5kbGUgdGhpcyBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgbW9kZWwgdG8gZ2VuZXJhdGUgYW4gZWRpdCByZXF1ZXN0IGZvci5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgVGhlIHNhdmVkIG1vZGVsIG9yIHVuZGVmaW5lZCBpZiBubyBzdWNoIG1vZGVsIHdhcyBmb3VuZC5cbiAgICovXG4gIGVkaXQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FwcGx5VG9Nb2RlbChpZCwgZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICAgIHdpZGdldE1vZGVsLmVkaXQoKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2F2ZXMgYW55IGlubGluZSBlZGl0cyB0byB0aGUgd2lkZ2V0LlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBkb2VzIG5vdCB0cmlnZ2VyIGEgc2VydmVyIHN5bmMuIEl0IHNpbXBseSB1cGRhdGVzIHRoZSB3aWRnZXRcbiAgICogbW9kZWwgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIGVkaXRvciB2aWV3LlxuICAgKlxuICAgKiBUaGUgZWRpdG9yIGlzIGluIGNoYXJnZSBvZiBtYW5hZ2luZyB0aGUgZ2VuZXJhdGVkIG1hcmt1cCBhbmQgc2VuZGluZyBpdCB0b1xuICAgKiB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgd2lkZ2V0IHRvIHNhdmUgaW5saW5lIGVkaXRzIGZvci5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXRFbFxuICAgKiAgIFRoZSBlbGVtZW50IHRvIHNhdmUgdGhlIG91dHB1dGVkIGRhdGEgZm9ybWF0IHRvLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRNb2RlbH1cbiAgICogICBUaGUgc2F2ZWQgbW9kZWwgb3IgdW5kZWZpbmVkIGlmIG5vIHN1Y2ggbW9kZWwgd2FzIGZvdW5kLlxuICAgKi9cbiAgc2F2ZTogZnVuY3Rpb24oaWQsICR0YXJnZXRFbCkge1xuICAgIHJldHVybiB0aGlzLl9hcHBseVRvTW9kZWwoaWQsIGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgICB3aWRnZXRNb2RlbC50cmlnZ2VyKCdzYXZlJyk7XG4gICAgICB0aGlzLl92aWV3RmFjdG9yeS5jcmVhdGVUZW1wb3Jhcnkod2lkZ2V0TW9kZWwsICR0YXJnZXRFbCwgJ2VkaXRvcicpLnNhdmUoKTtcbiAgICAgIHRoaXMuX3ZpZXdGYWN0b3J5LmNyZWF0ZVRlbXBvcmFyeSh3aWRnZXRNb2RlbCwgJHRhcmdldEVsLCAnZXhwb3J0JykucmVuZGVyKCkuc2F2ZSgpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhIHdpZGdldHMgdHJhY2tpbmcgZGF0YSBhbmQgaW5pdGlhdGVzIHdpZGdldCBkZXN0cnVjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgaWQgb2YgdGhlIHdpZGdldCB0byBiZSBkZXN0cm95ZWQuXG4gICAqIEBwYXJhbSB7Ym9vbH0gd2lkZ2V0RGVzdHJveWVkXG4gICAqICAgU2V0IHRvIHRydWUgaWYgdGhlIHdpZGdldCBoYXMgYWxyZWFkeSBiZWVuIGRlc3Ryb3llZCBpbiB0aGUgZWRpdG9yLlxuICAgKiAgIFNldHRpbmcgdGhpcyB0byBmYWxzZSB3aWxsIHJlc3VsdCBpbiB0aGUgZGVzdHJ1Y3Rpb24gb2YgdGhlIHdpZGdldCB3aXRoaW5cbiAgICogICB0aGUgZWRpdG9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRNb2RlbH1cbiAgICogICBUaGUgZGVzdHJveWVkIG1vZGVsLlxuICAgKi9cbiAgZGVzdHJveTogZnVuY3Rpb24oaWQsIHdpZGdldERlc3Ryb3llZCkge1xuICAgIHRoaXMuX2FwcGx5VG9Nb2RlbChpZCwgZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICAgIGlmICh3aWRnZXREZXN0cm95ZWQpIHtcbiAgICAgICAgd2lkZ2V0TW9kZWwuc2V0U3RhdGUoV2lkZ2V0TW9kZWwuU3RhdGUuREVTVFJPWUVEX1dJREdFVCk7XG4gICAgICB9XG4gICAgICB3aWRnZXRNb2RlbC5kZXN0cm95KCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENsZWFucyB1cCBhZnRlciB0aGUgd2lkZ2V0IG1hbmFnZXIgb2JqZWN0LlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2VkaXRvclZpZXcubW9kZWwuZGVzdHJveSgpO1xuICAgIHRoaXMuX2VkaXRvclZpZXcuc3RvcExpc3RlbmluZygpO1xuICAgIHRoaXMuX3dpZGdldFN0b3JlLmNsZWFudXAoKTtcbiAgICB0aGlzLl9lZGl0QnVmZmVyTWVkaWF0b3IuY2xlYW51cCgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBzZXR0aW5ncyBmb3IgdGhpcyBiaW5kZXIgaW5zdGFuY2UuXG4gICAqXG4gICAqIFRoZSBzZXR0aW5ncyBhcmUgbGlua2VkIHRvIHRoZSByb290IChlZGl0b3IpIGNvbnRleHQuXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICogICBUaGUgc2V0dGluZ3Mgb2JqZWN0IGZvciB0aGUgcm9vdCBjb250ZXh0LlxuICAgKi9cbiAgZ2V0U2V0dGluZ3M6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9jb250ZXh0UmVzb2x2ZXIuZ2V0RWRpdG9yQ29udGV4dCgpLmdldCgnc2V0dGluZ3MnKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0cyB0aGUgc2V0dGluZ3MgZm9yIHRoaXMgYmluZGVyIGluc3RhbmNlLlxuICAgKlxuICAgKiBUaGUgc2V0dGluZ3MgYXJlIGxpbmtlZCB0byB0aGUgcm9vdCAoZWRpdG9yKSBjb250ZXh0LlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3NcbiAgICogICBUaGUgc2V0dGluZ3Mgb2JqZWN0IHRvIHdyaXRlLiBOb3RlIHRoYXQgdGhpcyB3aWxsIG92ZXJ3cml0ZSB0aGUgKmVudGlyZSpcbiAgICogICBleGlzdGluZyBzZXR0aW5ncyBvYmplY3QuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBzZXRTZXR0aW5nczogZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICB0aGlzLl9jb250ZXh0UmVzb2x2ZXIuZ2V0RWRpdG9yQ29udGV4dCgpLnNldCh7IHNldHRpbmdzOiBzZXR0aW5ncyB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyBhbiBpbmRpdmlkdWFsIHNldHRpbmcgYnkgbmFtZS5cbiAgICpcbiAgICogVGhlIHNldHRpbmdzIGFyZSBsaW5rZWQgdG8gdGhlIHJvb3QgKGVkaXRvcikgY29udGV4dC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogICBUaGUgbmFtZSBvZiB0aGUgc2V0dGluZyB0byBsb29rdXAuXG4gICAqXG4gICAqIEByZXR1cm4ge21peGVkfVxuICAgKiAgIFRoZSBzZXR0aW5nIHZhbHVlIG9yIHVuZGVmaW5lZCBpZiBubyB2YWx1ZSB3YXMgZm91bmQuXG4gICAqL1xuICBnZXRTZXR0aW5nOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbnRleHRSZXNvbHZlci5nZXRFZGl0b3JDb250ZXh0KCkuZ2V0U2V0dGluZyhuYW1lKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVzb2x2ZXMgdGhlIGNvbnRleHQgZm9yIGFuIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxcbiAgICogICBUaGUgZWxlbWVudCB0byByZXNvbHZlIHRoZSBjb250ZXh0IG9mLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgKiAgIFRoZSB0eXBlIG9mIHJlc29sdXRpb24gdG8gcGVyZm9ybS4gVGhlIG9wdGlvbnMgYXJlOlxuICAgKiAgICAtICd0YXJnZXQnOiBSZXNvbHZlcyB0aGUgY29uZXh0IGF0IHRoZSBlbGVtZW50cyBwb3NpdGlvbiBpbiB0aGUgZWRpdG9yLlxuICAgKiAgICAgIFRoaXMgaXMgdXN1YWxseSB0aGUgY29udGV4dCB5b3UgYXJlIGxvb2tpbmcgZm9yLCBhbmQgaXMgdGhlIGRlZmF1bHRcbiAgICogICAgICBpZiBubyB0eXBlIGlzIGV4cGxpY2l0bHkgcHJvdmlkZWQuXG4gICAqICAgIC0gJ3NvdXJjZSc6IFJlc29sdmVzIHRoZSBjb250ZXh0IHRoZSBlbGVtZW50IGhhcyBiZWVuIHRhZ2dlZCB3aXRoLlxuICAgKiAgICAgIFRoZSBzb3VyY2UgY29udGV4dCBtYXkgYmUgZGlmZmVyZW50IHRoYW4gdGhlIHRhcmdldCBjb250ZXh0IGlmLCBmb3JcbiAgICogICAgICBleGFtcGxlLCB0aGUgd2lkZ2V0IHdhcyByZWNlbnRseSBjb3BpZWQgZnJvbSBvbmUgY29udGV4dCBhbmQgcGFzdGVkXG4gICAqICAgICAgaW50byBhbm90aGVyLiBUaGUgd2lkZ2V0IGJpbmRlciBhdXRvbWF0aWNhbGx5IHJlc29sdmVzIHRoZXNlXG4gICAqICAgICAgc2l0dWF0aW9ucyBpbiB0aGUgYmFja2dyb3VuZCwgc28gdGhlcmUgc2hvdWxkIHJhcmVseSBiZSBhIHNpdHVhdGlvblxuICAgKiAgICAgIHdoZXJlIGNsaWVudCBjb2RlIG5lZWRzIHRoZSBzb3VyY2UgY29udGV4dC5cbiAgICpcbiAgICogQHJldHVybiB7QmFja2JvbmUuTW9kZWx9XG4gICAqICAgVGhlIGNvbnRleHQgbW9kZWwgYXNzb2NpYXRlZCB3aXRoIHRoZSBlbGVtZW50LlxuICAgKi9cbiAgcmVzb2x2ZUNvbnRleHQ6IGZ1bmN0aW9uKCRlbCwgdHlwZSkge1xuICAgIGlmICghdHlwZSkge1xuICAgICAgdHlwZSA9ICd0YXJnZXQnO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PSAndGFyZ2V0Jykge1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHRSZXNvbHZlci5yZXNvbHZlVGFyZ2V0Q29udGV4dCgkZWwpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlID09ICdzb3VyY2UnKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY29udGV4dFJlc29sdmVyLnJlc29sdmVTb3VyY2VDb250ZXh0KCRlbCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbnRleHQgdHlwZS4nKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEEgY29udmVuaWVuY2UgZnVuY3Rpb24gZm9yIGxvb2tpbmcgdXAgYSB3aWRnZXQgYW5kIGFwcGx5aW5nIGFuIGFjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgaWQgb2YgdGhlIHdpZGdldCB0byBhY3Qgb24uXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAqICAgVGhlIGFjdGlvbiB0byBhcHBseSB0aGUgbW9kZWwsIGlmIGZvdW5kLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRNb2RlbH1cbiAgICogICBUaGUgbW9kZWwgYWN0ZWQgb24sIGlmIGFuIGFjdGlvbiB3YXMgYXBwbGllZC5cbiAgICovXG4gIF9hcHBseVRvTW9kZWw6IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICAgIHZhciB3aWRnZXRNb2RlbCA9IHRoaXMuZ2V0KGlkKTtcbiAgICBpZiAod2lkZ2V0TW9kZWwpIHtcbiAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIFt3aWRnZXRNb2RlbF0pO1xuICAgICAgcmV0dXJuIHdpZGdldE1vZGVsO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIGNvbGxlY3Rpb24gb2Ygc2NoZW1hIG1vZGVscy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIENvbnRleHRNb2RlbCA9IHJlcXVpcmUoJy4uL01vZGVscy9Db250ZXh0TW9kZWwnKTtcblxuLyoqXG4gKiBCYWNrYm9uZSBDb2xsZWN0aW9uIGZvciBjb250ZXh0IG1vZGVscy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAYXVnbWVudHMgQmFja2JvbmUuTW9kZWxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cbiAgbW9kZWw6IENvbnRleHRNb2RlbCxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGdldDogZnVuY3Rpb24oY29udGV4dElkLCBzZXR0aW5ncywgc2tpcExhenlMb2FkKSB7XG4gICAgaWYgKHR5cGVvZiBjb250ZXh0SWQgPT0gJ3N0cmluZycgJiYgIXNraXBMYXp5TG9hZCkge1xuICAgICAgaWYgKCFCYWNrYm9uZS5Db2xsZWN0aW9uLnByb3RvdHlwZS5nZXQuY2FsbCh0aGlzLCBjb250ZXh0SWQpKSB7XG4gICAgICAgIGlmICghc2V0dGluZ3MpIHtcbiAgICAgICAgICBzZXR0aW5ncyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHZhciBtb2RlbCA9IG5ldyBDb250ZXh0TW9kZWwoeyBpZDogY29udGV4dElkLCBzZXR0aW5nczogc2V0dGluZ3MgfSk7XG4gICAgICAgIHRoaXMuYWRkKG1vZGVsKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIEJhY2tib25lLkNvbGxlY3Rpb24ucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIGNvbnRleHRJZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbnZlbmllbmNlIHdyYXBwZXIgZm9yICdnZXQnIHRvIGVuc3VyZSB0aGF0IGEgY29udGV4dCBleGlzdHMuXG4gICAqXG4gICAqIEBub3RlIHRoaXMgZG9lcyBub3QgcmV0dXJuIHRoZSBjb250ZXh0LlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGV4dElkXG4gICAqICAgVGhlIGNvbnRleHQgaWQgdG8gZW5zdXJlIGV4aXN0cy5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIHRvdWNoOiBmdW5jdGlvbihjb250ZXh0SWQpIHtcbiAgICB0aGlzLmdldChjb250ZXh0SWQpO1xuICB9XG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgdGhlIGxvZ2ljIGZvciBleGVjdXRpbmcgY29tbWFuZHMgZnJvbSB0aGUgcXVldWUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICBFZGl0QnVmZmVySXRlbU1vZGVsID0gcmVxdWlyZSgnLi4vTW9kZWxzL0VkaXRCdWZmZXJJdGVtTW9kZWwnKTtcblxuLyoqXG4gKiBCYWNrYm9uZSBDb2xsZWN0aW9uIGZvciBlZGl0IGJ1ZmZlciBpdGVtIG1vZGVscy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAYXVnbWVudHMgQmFja2JvbmUuTW9kZWxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cbiAgbW9kZWw6IEVkaXRCdWZmZXJJdGVtTW9kZWwsXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9jb250ZXh0SWQgPSBvcHRpb25zLmNvbnRleHRJZDtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGFuIGVkaXQgYnVmZmVyIGl0ZW0gbW9kZWwuXG4gICAqXG4gICAqIExvYWRzIHRoZSBpdGVtIGZyb20gdGhlIHNlcnZlciBpdCBkb2VzIG5vdCBjdXJyZW50bHkgZXhpc3QgaW4gdGhlIGNsaWVudC1zaWRlXG4gICAqIGJ1ZmZlci5cbiAgICpcbiAgICogQHBhcmFtIHtDb21tYW5kRW1pdHRlcn0gY29tbWFuZEVtaXR0ZXJcbiAgICogICBUaGUgZWRpdG9yIGNvbW1hbmQgZW1pdHRlciB0byB1c2UgaW4gY2FzZSB0aGUgaXRlbSBjYW5ub3QgYmUgZm91bmRcbiAgICogICBsb2NhbGx5LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXVpZFxuICAgKiAgIFRoZSBlZGl0IGJ1ZmZlciBpdGVtIGlkIHRvIGdldC5cbiAgICpcbiAgICogQHJldHVybiB7QmFja2JvbmUuTW9kZWx9XG4gICAqICAgVGhlIGJ1ZmZlciBpdGVtIG1vZGVsLlxuICAgKi9cbiAgZ2V0SXRlbTogZnVuY3Rpb24oY29tbWFuZEVtaXR0ZXIsIHV1aWQpIHtcbiAgICB2YXIgaXRlbU1vZGVsID0gdGhpcy5nZXQodXVpZCk7XG4gICAgaWYgKCFpdGVtTW9kZWwpIHtcbiAgICAgIGl0ZW1Nb2RlbCA9IHRoaXMuYWRkKHtpZDogdXVpZH0sIHttZXJnZTogdHJ1ZX0pO1xuICAgICAgY29tbWFuZEVtaXR0ZXIucmVuZGVyKHRoaXMuZ2V0Q29udGV4dElkKCksIHV1aWQpO1xuICAgIH1cbiAgICByZXR1cm4gaXRlbU1vZGVsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBQcm92aWRlcyBhIGNvbnNpc3RlbnQgJ3NldHRlcicgQVBJIHdyYXBwZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7QmFja2JvbmUuTW9kZWx9IGl0ZW1Nb2RlbFxuICAgKiAgIFRoZSBtb2RlbCB0byBiZSBzZXQgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm4ge21peGVkfVxuICAgKiAgIFNlZSByZXR1cm4gdmFsdWUgZm9yIEJhY2tib25lLkNvbGxlY3Rpb24uYWRkLlxuICAgKi9cbiAgc2V0SXRlbTogZnVuY3Rpb24oaXRlbU1vZGVsKSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkKGl0ZW1Nb2RlbCwge21lcmdlOiB0cnVlfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFByb3ZpZGVzIGEgY29uc2lzdGVudCBBUEkgd3JhcHBlciBmb3IgcmVtb3ZpbmcgaXRlbXMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1dWlkXG4gICAqICAgVGhlIHV1aWQgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIHJlbW92ZUl0ZW06IGZ1bmN0aW9uKHV1aWQpIHtcbiAgICB0aGlzLnJlbW92ZSh1dWlkKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgY29udGV4dCBpZCB0aGlzIGVkaXQgYnVmZmVyIGJlbG9uZ3MgdG8uXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICogICBUaGUgY29udGV4dCBpZC5cbiAgICovXG4gIGdldENvbnRleHRJZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbnRleHRJZDtcbiAgfVxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgRWRpdG9yTW9kZWwgPSByZXF1aXJlKCcuLi9Nb2RlbHMvRWRpdG9yTW9kZWwnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICBtb2RlbDogRWRpdG9yTW9kZWwsXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgY29sbGVjdGlvbiBvZiBzY2hlbWEgZW50cnkgbW9kZWxzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICBTY2hlbWFNb2RlbCA9IHJlcXVpcmUoJy4uL01vZGVscy9TY2hlbWFNb2RlbCcpO1xuXG4vKipcbiAqIEJhY2tib25lIENvbGxlY3Rpb24gZm9yIHNjaGVtYSBtb2RlbHMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXG4gIG1vZGVsOiBTY2hlbWFNb2RlbCxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKG1vZGVscywgb3B0aW9ucykge1xuICAgIHRoaXMubGlzdGVuVG8ob3B0aW9ucy5jb250ZXh0Q29sbGVjdGlvbiwgJ2FkZCcsIHRoaXMuYWRkQ29udGV4dFNjaGVtYSk7XG4gICAgdGhpcy5fZGlzcGF0Y2hlciA9IG9wdGlvbnMuZGlzcGF0Y2hlcjtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGEgdHlwZSBpcyBhbGxvd2VkIHdpdGhpbiBhIGdpdmVuIHNjaGVtYSBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc2NoZW1hSWRcbiAgICogICBUaGUgc2NoZW1hIGlkIHRvIGNoZWNrIHdpdGhpbi5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogICBUaGUgdHlwZSB0byBjaGVjayBmb3IuXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2x9XG4gICAqICAgVHJ1ZSBpZiB0aGUgdHlwZSBpcyBhbGxvd2VkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBpc0FsbG93ZWQ6IGZ1bmN0aW9uKHNjaGVtYUlkLCB0eXBlKSB7XG4gICAgdmFyIG1vZGVsID0gdGhpcy5nZXQoc2NoZW1hSWQpO1xuICAgIHJldHVybiAhIShtb2RlbCAmJiBtb2RlbC5nZXQoJ2FsbG93ZWQnKVt0eXBlXSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZHMgdGhlIHNjaGVtYSBmb3IgYSBnaXZlbiBjb250ZXh0LlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbnRleHR9IGNvbnRleHRNb2RlbFxuICAgKiAgIFRoZSBjb250ZXh0IHRvIGFkZCB0aGUgc2NoZW1hIGZvci5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGFkZENvbnRleHRTY2hlbWE6IGZ1bmN0aW9uKGNvbnRleHRNb2RlbCkge1xuICAgIHRoaXMuX2ZldGNoU2NoZW1hKGNvbnRleHRNb2RlbCk7XG4gICAgdGhpcy5saXN0ZW5Ubyhjb250ZXh0TW9kZWwsICdjaGFuZ2U6c2NoZW1hSWQnLCB0aGlzLl9mZXRjaFNjaGVtYSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhlbHBlciBmdW5jdGlvbiB0byBmZXRjaCB0aGUgc2NoZW1hIGZvciBhIG1vZGVsIGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICAqXG4gICAqIEBwYXJhbSB7Q29udGV4dH0gY29udGV4dE1vZGVsXG4gICAqICAgVGhlIG1vZGVsIHRvIGZldGNoIHRoZSBzY2hlbWEgZm9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX2ZldGNoU2NoZW1hOiBmdW5jdGlvbihjb250ZXh0TW9kZWwpIHtcbiAgICB2YXIgaWQgPSBjb250ZXh0TW9kZWwuZ2V0KCdzY2hlbWFJZCcpO1xuICAgIGlmIChpZCkge1xuICAgICAgaWYgKCF0aGlzLmdldChpZCkpIHtcbiAgICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCgnRkVUQ0hfU0NIRU1BJywgaWQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG59KTtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICBXaWRnZXRNb2RlbCA9IHJlcXVpcmUoJy4uL01vZGVscy9XaWRnZXRNb2RlbCcpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gIG1vZGVsOiBXaWRnZXRNb2RlbCxcbn0pO1xuXG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhIG1lY2hhbmlzbSBmb3IgY29udHJvbGxpbmcgc3Vic2NyaXB0aW9ucyB0byBtdWx0aXBsZSBjb250ZXh0cy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICogTGlzdGVucyB0byBhIGdyb3VwIG9mIGNvbnRleHQncyBlZGl0IGJ1ZmZlcnMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuXG4gIC8qKlxuICAgKiBBZGQgYSBjb250ZXh0IHRvIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQHBhcmFtIHtDb250ZXh0fSBjb250ZXh0XG4gICAqICAgVGhlIGNvbnRleHQgdG8gbGlzdGVuIHRvLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIGFkZENvbnRleHQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICB0aGlzLmxpc3RlblRvKGNvbnRleHQuZWRpdEJ1ZmZlciwgJ2FkZCcsIHRoaXMuX3RyaWdnZXJFdmVudHMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiAnaW5zZXJ0SXRlbScgb3IgJ3VwZGF0ZUl0ZW0nIGV2ZW50IGZvciBhIG1vZGVsLlxuICAgKlxuICAgKiBAcGFyYW0ge0VkaXRCdWZmZXJJdGVtTW9kZWx9IGJ1ZmZlckl0ZW1Nb2RlbFxuICAgKiAgIFRoZSBtb2RlbCB0aGF0IHRoZSBldmVudCBpcyBiZWluZyB0cmlnZ2VyZWQgZm9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX3RyaWdnZXJFdmVudHM6IGZ1bmN0aW9uKGJ1ZmZlckl0ZW1Nb2RlbCkge1xuICAgIGlmIChidWZmZXJJdGVtTW9kZWwuZ2V0KCdpbnNlcnQnKSkge1xuICAgICAgdGhpcy50cmlnZ2VyKCdpbnNlcnRJdGVtJywgYnVmZmVySXRlbU1vZGVsKTtcbiAgICAgIGJ1ZmZlckl0ZW1Nb2RlbC5zZXQoe2luc2VydDogZmFsc2V9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnRyaWdnZXIoJ3VwZGF0ZUl0ZW0nLCBidWZmZXJJdGVtTW9kZWwpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ2xlYW5zIHVwIGFmdGVyIHRoZSBvYmplY3Qgd2hlbiBpdCBpcyByZWFkeSB0byBiZSBkZXN0cm95ZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgfVxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBjb21tYW5kcyBmcm9tIHRoZSBxdWV1ZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqIEEgY2xhc3MgZm9yIHJlc29sdmluZyB0aGUgYXNzaWN1YXRlZCBjb250ZXh0KHMpIGZvciBhbiBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7Q29uZXh0Q29sbGVjdGlvbn0gY29udGV4dENvbGxlY3Rpb25cbiAqICAgVGhlIGNvbnRleHRDb2xsZWN0aW9uIHRvIHVzZSB0byBsb29rdXAgY29udGV4dHMuXG4gKiBAcGFyYW0ge3N0cmluZ30gc291cmNlQ29udGV4dEF0dHJpYnV0ZVxuICogICBUaGUgc291cmNlIGNvbnRleHQgYXR0cmlidXRlIG5hbWUuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZVxuICogICBUaGUgdGFyZ2V0IGNvbnRleHQgYXR0cmlidXRlIG5hbWUuXG4gKiBAcGFyYW0ge0NvbnRleHR9IGVkaXRvckNvbnRleHRcbiAqICAgVGhlIHJvb3QgY29udGV4dCBvZiB0aGUgZWRpdG9yIGluc3RhbmNlLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRleHRDb2xsZWN0aW9uLCBzb3VyY2VDb250ZXh0QXR0cmlidXRlLCB0YXJnZXRDb250ZXh0QXR0cmlidXRlLCBlZGl0b3JDb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHRDb2xsZWN0aW9uID0gY29udGV4dENvbGxlY3Rpb247XG4gIHRoaXMuX3NvdXJjZUNvbnRleHRBdHRyaWJ1dGUgPSBzb3VyY2VDb250ZXh0QXR0cmlidXRlO1xuICB0aGlzLl90YXJnZXRDb250ZXh0QXR0cmlidXRlID0gdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZTtcbiAgdGhpcy5fZWRpdG9yQ29udGV4dCA9IGVkaXRvckNvbnRleHQ7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogUmVzb2x2ZXMgdGhlIGNvbnRleHQgb2YgYW4gZWxlbWVudCBiYXNlZCBvbiBpdHMgcG9zaXRpb24gaW4gdGhlIGVkaXRvci5cbiAgICpcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbFxuICAgKiAgIFRoZSBlbGVtZW50IHRvIHJlc29sdmUgdGhlIGNvbnRleHQgb2YuXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLk1vZGVsfVxuICAgKiAgIFRoZSBjb250ZXh0IG1vZGVsIGFzc29jaWF0ZWQgd2l0aCB0aGUgZWxlbWVudC5cbiAgICovXG4gIHJlc29sdmVUYXJnZXRDb250ZXh0OiBmdW5jdGlvbiAoJGVsKSB7XG4gICAgdmFyIGNvbnRleHRJZCA9ICRlbC5hdHRyKHRoaXMuX3RhcmdldENvbnRleHRBdHRyaWJ1dGUpO1xuICAgIGlmICghY29udGV4dElkKSB7XG4gICAgICBjb250ZXh0SWQgPSAkZWwuY2xvc2VzdCgnWycgKyB0aGlzLl90YXJnZXRDb250ZXh0QXR0cmlidXRlICsgJ10nKS5hdHRyKHRoaXMuX3RhcmdldENvbnRleHRBdHRyaWJ1dGUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldChjb250ZXh0SWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlcyB0aGUgY29udGV4dCBhbiBlbGVtZW50IGhhcyBiZWVuIHRhZ2dlZCB3aXRoLlxuICAgKlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsXG4gICAqICAgVGhlIGVsZW1lbnQgdG8gcmVzb2x2ZSB0aGUgY29udGV4dCBvZi5cbiAgICpcbiAgICogQHJldHVybiB7QmFja2JvbmUuTW9kZWx9XG4gICAqICAgVGhlIGNvbnRleHQgbW9kZWwgYXNzb2NpYXRlZCB3aXRoIHRoZSBlbGVtZW50LlxuICAgKi9cbiAgcmVzb2x2ZVNvdXJjZUNvbnRleHQ6IGZ1bmN0aW9uKCRlbCkge1xuICAgIHZhciBjb250ZXh0SWQgPSAkZWwuYXR0cih0aGlzLl9zb3VyY2VDb250ZXh0QXR0cmlidXRlKTtcbiAgICByZXR1cm4gY29udGV4dElkID8gdGhpcy5nZXQoY29udGV4dElkKSA6IHRoaXMuX2VkaXRvckNvbnRleHQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHJvb3QgZWRpdG9yIGNvbnRleHQuXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLk1vZGVsfVxuICAgKiAgIFRoZSByb290IGVkaXRvciBjb250ZXh0LlxuICAgKi9cbiAgZ2V0RWRpdG9yQ29udGV4dDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VkaXRvckNvbnRleHQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgYSBjb250ZXh0IGJhc2VkIG9uIGl0cyBjb250ZXh0IGlkLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGV4dElkXG4gICAqICAgVGhlIGlkIG9mIHRoZSBjb250ZXh0IHRvIGdldC5cbiAgICpcbiAgICogQHJldHVybiB7QmFja2JvbmUuTW9kZWx9XG4gICAqICAgVGhlIGNvbnRleHQgbW9kZWwuXG4gICAqL1xuICBnZXQ6IGZ1bmN0aW9uKGNvbnRleHRJZCkge1xuICAgIGlmIChjb250ZXh0SWQpIHtcbiAgICAgIHZhciBzZXR0aW5ncyA9IHRoaXMuX2VkaXRvckNvbnRleHQgPyB0aGlzLl9lZGl0b3JDb250ZXh0LmdldCgnc2V0dGluZ3MnKSA6IHt9O1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHRDb2xsZWN0aW9uLmdldChjb250ZXh0SWQsIHNldHRpbmdzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fZWRpdG9yQ29udGV4dDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEVuc3VyZXMgdGhhdCBhIGNvbnRleHQgZXhpc3RzIGluIHRoZSBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGV4dElkXG4gICAqICAgVGhlIGNvbnRleHQgaWQgdG8gZW5zdXJlIGV4aXN0cy5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIHRvdWNoOiBmdW5jdGlvbihjb250ZXh0SWQpIHtcbiAgICB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbi50b3VjaChjb250ZXh0SWQpO1xuICB9LFxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGFuIGFjdGlvbmFibGUgcmVmZXJlbmNlIHRvIGEgZWRpdCBidWZmZXIgaXRlbS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZWZlcmVuY2UgdG8gYW4gZWRpdCBidWZmZXIgaXRlbS5cbiAqXG4gKiBAcGFyYW0ge0VkaXRCdWZmZXJJdGVtTW9kZWx9IGJ1ZmZlckl0ZW1Nb2RlbFxuICogICBUaGUgbW9kZWwgdGhpcyB3aWxsIHJlZmVyZW5jZS5cbiAqIEBwYXJhbSB7Q29udGV4dH0gc291cmNlQ29udGV4dFxuICogICBUaGUgY29udGV4dCB0aGUgZWRpdCBidWZmZXIgaXRlbSBzYXlzIGl0IGJlbG9uZ3MgdG8uXG4gKiBAcGFyYW0ge0NvbmV4dH0gdGFyZ2V0Q29udGV4dFxuICogICBUaGUgY29udGV4dCB0aGUgZWRpdCBidWZmZXIgaXRlbSdzIGFzc29jaWF0ZWQgd2lkZ2V0IGxpdmVzIGluLlxuICogQHBhcmFtIHtDb21tYW5kRW1pdHRlcn0gY29tbWFuZEVtaXR0ZXJcbiAqICAgQSBjb21tYW5kIGVtaXR0ZXIgZm9yIGVtaXR0aW5nIGNvbW1hbmRzIHJlbGF0ZWQgdG8gdGhlIHJlZmVyZW5jZWQgZWRpdFxuICogICBidWZmZXIgaXRlbS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihidWZmZXJJdGVtTW9kZWwsIHNvdXJjZUNvbnRleHQsIHRhcmdldENvbnRleHQsIGNvbW1hbmRFbWl0dGVyKSB7XG4gIHRoaXMuZWRpdEJ1ZmZlckl0ZW0gPSBidWZmZXJJdGVtTW9kZWw7IFxuICB0aGlzLnNvdXJjZUNvbnRleHQgPSBzb3VyY2VDb250ZXh0OyBcbiAgdGhpcy50YXJnZXRDb250ZXh0ID0gdGFyZ2V0Q29udGV4dDsgXG4gIHRoaXMuX2NvbW1hbmRFbWl0dGVyID0gY29tbWFuZEVtaXR0ZXI7IFxufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIElzc3VlcyBhbiBlZGl0IGNvbW1hbmQgZm9yIHRoZSByZWZlcmVuY2VkIGJ1ZmZlciBpdGVtLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gZWRpdHNcbiAgICogICBBIG1hcCB3aGVyZSBrZXlzIGFyZSBjb250ZXh0IGlkcyBhbmQgdmFsdWVzIGFyZSB0aGVpciBhc3NvY2lhdGVkIGlubGluZVxuICAgKiAgIGVkaXRzLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZWRpdDogZnVuY3Rpb24oZWRpdHMpIHtcbiAgICB0aGlzLl9jb21tYW5kRW1pdHRlci5lZGl0KHRoaXMudGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyksIHRoaXMuZWRpdEJ1ZmZlckl0ZW0uZ2V0KCdpZCcpLCBlZGl0cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIElzc3VlcyBhIHJlbmRlciBjb21tYW5kIGZvciB0aGUgcmVmZXJlbmNlZCBidWZmZXIgaXRlbS5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgd2hlcmUga2V5cyBhcmUgY29udGV4dCBpZHMgYW5kIHZhbHVlcyBhcmUgdGhlaXIgYXNzb2NpYXRlZCBpbmxpbmVcbiAgICogICBlZGl0cy5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIHJlbmRlcjogZnVuY3Rpb24oZWRpdHMpIHtcbiAgICB0aGlzLl9jb21tYW5kRW1pdHRlci5yZW5kZXIodGhpcy50YXJnZXRDb250ZXh0LmdldCgnaWQnKSwgdGhpcy5lZGl0QnVmZmVySXRlbS5nZXQoJ2lkJyksIGVkaXRzKTtcbiAgfSxcblxuICAvKipcbiAgICogSXNzdWVzIGEgZHVwbGljYXRlIGNvbW1hbmQgZm9yIHRoZSByZWZlcmVuY2VkIGJ1ZmZlciBpdGVtLlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSB3aWRnZXRJZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgd2lkZ2V0IHRoYXQgd2lsbCByZWNpZXZlIHRoZSBkdXBsaWNhdGUuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBlZGl0c1xuICAgKiAgIEEgbWFwIHdoZXJlIGtleXMgYXJlIGNvbnRleHQgaWRzIGFuZCB2YWx1ZXMgYXJlIHRoZWlyIGFzc29jaWF0ZWQgaW5saW5lXG4gICAqICAgZWRpdHMuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBkdXBsaWNhdGU6IGZ1bmN0aW9uKHdpZGdldElkLCBlZGl0cykge1xuICAgIHRoaXMuX2NvbW1hbmRFbWl0dGVyLmR1cGxpY2F0ZSh0aGlzLnRhcmdldENvbnRleHQuZ2V0KCdpZCcpLCB0aGlzLnNvdXJjZUNvbnRleHQuZ2V0KCdpZCcpLCB0aGlzLmVkaXRCdWZmZXJJdGVtLmdldCgnaWQnKSwgd2lkZ2V0SWQsIGVkaXRzKTtcbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGEgZmFjdG9yeSBmb3IgY3JlYXRpbmcgZWRpdCBidWZmZXIgaXRlbSByZWZlcmVuY2VzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEVkaXRCdWZmZXJJdGVtUmVmID0gcmVxdWlyZSgnLi9FZGl0QnVmZmVySXRlbVJlZicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRleHRSZXNvbHZlciwgY29tbWFuZEVtaXR0ZXIpIHtcbiAgdGhpcy5fY29udGV4dFJlc29sdmVyID0gY29udGV4dFJlc29sdmVyO1xuICB0aGlzLl9jb21tYW5kRW1pdHRlciA9IGNvbW1hbmRFbWl0dGVyO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgY3JlYXRlOiBmdW5jdGlvbihidWZmZXJJdGVtTW9kZWwsIHNvdXJjZUNvbnRleHQsIHRhcmdldENvbnRleHQpIHtcbiAgICB2YXIgZmFsbGJhY2tDb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldChidWZmZXJJdGVtTW9kZWwuY29sbGVjdGlvbi5nZXRDb250ZXh0SWQoKSk7XG5cbiAgICBpZiAoIXNvdXJjZUNvbnRleHQpIHtcbiAgICAgIHNvdXJjZUNvbnRleHQgPSBmYWxsYmFja0NvbnRleHQ7XG4gICAgfVxuXG4gICAgaWYgKCF0YXJnZXRDb250ZXh0KSB7XG4gICAgICB0YXJnZXRDb250ZXh0ID0gZmFsbGJhY2tDb250ZXh0O1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgRWRpdEJ1ZmZlckl0ZW1SZWYoYnVmZmVySXRlbU1vZGVsLCBzb3VyY2VDb250ZXh0LCB0YXJnZXRDb250ZXh0LCB0aGlzLl9jb21tYW5kRW1pdHRlcik7XG4gIH0sXG5cbiAgY3JlYXRlRnJvbUlkczogZnVuY3Rpb24oaXRlbUlkLCBzb3VyY2VDb250ZXh0SWQsIHRhcmdldENvbnRleHRJZCkge1xuICAgIGlmICghc291cmNlQ29udGV4dElkIHx8ICF0YXJnZXRDb250ZXh0SWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU291cmNlIGFuZCB0YXJnZXQgY29udGV4dCBpZHMgYXJlIGV4cGxpY2l0bHkgcmVxdWlyZWQnKTtcbiAgICB9XG4gICAgdmFyIHNvdXJjZUNvbnRleHQgPSB0aGlzLl9jb250ZXh0UmVzb2x2ZXIuZ2V0KHNvdXJjZUNvbnRleHRJZCk7XG4gICAgdmFyIHRhcmdldENvbnRleHQgPSB0aGlzLl9jb250ZXh0UmVzb2x2ZXIuZ2V0KHRhcmdldENvbnRleHRJZCk7XG4gICAgdmFyIGJ1ZmZlckl0ZW1Nb2RlbCA9IHNvdXJjZUNvbnRleHQuZWRpdEJ1ZmZlci5nZXRJdGVtKHRoaXMuX2NvbW1hbmRFbWl0dGVyLCBpdGVtSWQpO1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZShidWZmZXJJdGVtTW9kZWwsIHNvdXJjZUNvbnRleHQsIHRhcmdldENvbnRleHQpO1xuICB9LFxuXG4gIHJlcXVlc3ROZXdJdGVtOiBmdW5jdGlvbih0YXJnZXRDb250ZXh0LCB0eXBlKXtcbiAgICB0aGlzLl9jb21tYW5kRW1pdHRlci5pbnNlcnQodGFyZ2V0Q29udGV4dCwgdHlwZSk7XG4gIH0sXG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYSBtZWRpYXRvciBmb3IgbmVnb3RpYXRpbmcgdGhlIGluc2VydGlvbiBvZiBuZXcgaXRlbXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG4vKipcbiAqIEEgY2xhc3MgZm9yIG1lZGlhdGluZyByZXF1ZXN0cyBmb3IgbmV3IGVkaXQgYnVmZmVyIGl0ZW1zIGZyb20gdGhlIHNlcnZlci5cbiAqXG4gKiBAcGFyYW0ge0VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeX0gZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5XG4gKiAgIFRoZSBmYWN0b3J5IHRvIHVzZSBmb3IgY3JlYXRpbmcgZWRpdCBidWZmZXIgaXRlbSByZWZlcmVuY2VzLlxuICogQHBhcmFtIHtFbGVtZW50RmFjdG9yeX0gZWxlbWVudEZhY3RvcnlcbiAqICAgVGhlIGZhY3RvcnkgdG8gdXNlIGZvciBjcmVhdGluZyBlbWJlZGFibGUgd2lkZ2V0IGVsZW1lbnRzLlxuICogQHBhcmFtIHtDb250ZXh0TGlzdGVuZXJ9IGNvbnRleHRMaXN0ZW5lclxuICogICBUaGUgbGlzdGVuZXIgdGhhdCBsaXN0ZW5zIGZvciBuZXcgZWRpdCBidWZmZXIgaXRlbXMgYmVpbmcgZGVsaXZlcmVkLlxuICogQHBhcmFtIHtFZGl0b3JBZGFwdGVyfSBhZGFwdGVyXG4gKiAgIFRoZSBlZGl0b3IgYWRhcHRlciB0aGF0IGhhbmRsZXMgaW5zZXJ0aW9uIG9mIG5ldyBlbWJlZCBjb2RlcyBpbnRvIHRoZVxuICogICBlZGl0b3IuXG4gKiBAcGFyYW0ge0NvbnRleHRSZXNvbHZlcn0gY29udGV4dFJlc29sdmVyXG4gKiAgIFRoZSBjb250ZXh0IHJlc29sdmVyIHRvIHVzZSBmb3IgcmVzb2x2aW5nIHRoZSBjb250ZXh0IHRoYXQgYSB3aWRnZXQgaXNcbiAqICAgYmVpbmcgaW5zZXJ0ZWQgaW50by5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnksIGVsZW1lbnRGYWN0b3J5LCBjb250ZXh0TGlzdGVuZXIsIGFkYXB0ZXIsIGNvbnRleHRSZXNvbHZlcikge1xuICB0aGlzLl9lZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkgPSBlZGl0QnVmZmVySXRlbVJlZkZhY3Rvcnk7XG4gIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gZWxlbWVudEZhY3Rvcnk7XG4gIHRoaXMuX2NvbnRleHRMaXN0ZW5lciA9IGNvbnRleHRMaXN0ZW5lcjtcbiAgdGhpcy5fYWRhcHRlciA9IGFkYXB0ZXI7XG4gIHRoaXMuX2NvbnRleHRSZXNvbHZlciA9IGNvbnRleHRSZXNvbHZlcjtcbiAgdGhpcy5saXN0ZW5Ubyh0aGlzLl9jb250ZXh0TGlzdGVuZXIsICdpbnNlcnRJdGVtJywgdGhpcy5faW5zZXJ0QnVmZmVySXRlbSk7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyB0aGUgd2lkZ2V0IGluc2VydGlvbiBmbG93LlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgKiAgIFRoZSB0eXBlIG5hbWUgb2YgdGhlIHdpZGdldCB0byBpbnNlcnQuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxcbiAgICogICBUaGUgaW5zZXJ0aW9uIHBvaW50IGZvciB0aGUgbmV3IGl0ZW0gYmVpbmcgcmVxdWVzdGVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgcmVxdWVzdEJ1ZmZlckl0ZW06IGZ1bmN0aW9uKHR5cGUsICRlbCkge1xuICAgIHZhciB0YXJnZXRDb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLnJlc29sdmVUYXJnZXRDb250ZXh0KCRlbCk7XG4gICAgdGhpcy5fY29udGV4dExpc3RlbmVyLmFkZENvbnRleHQodGFyZ2V0Q29udGV4dCk7XG4gICAgdGhpcy5fZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LnJlcXVlc3ROZXdJdGVtKHRhcmdldENvbnRleHQuZ2V0KCdpZCcpLCB0eXBlKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2xlYW5zIHVwIHRoZSBtZWRpYXRvciBpbiBwcmVwYXJhdGlvbiBmb3IgZGVzdHJ1Y3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jb250ZXh0TGlzdGVuZXIuY2xlYW51cCgpO1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIYW5kbGVyIGZvciBuZXcgZWRpdCBidWZmZXIgaXRlbXMgYmVpbmcgZGVsaXZlcmVkLlxuICAgKlxuICAgKiBAcGFyYW0ge0VkaXRCdWZmZXJJdGVtTW9kZWx9IGJ1ZmZlckl0ZW1Nb2RlbFxuICAgKiAgIFRoZSBuZXcgbW9kZWwgYmVpbmcgaW5zZXJ0ZWRcbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF9pbnNlcnRCdWZmZXJJdGVtOiBmdW5jdGlvbihidWZmZXJJdGVtTW9kZWwpIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeS5jcmVhdGUoYnVmZmVySXRlbU1vZGVsKTtcblxuICAgIC8vIElmIHRoZSBuZXcgbW9kZWwgaXMgcmVhZHkgdG8gYmUgaW5zZXJ0ZWQsIGluc2VydCBhbiBlbWJlZCBjb2RlIGluXG4gICAgLy8gRWRpdG9yIGFuZCBtYXJrIHRoZSBtb2RlbCBhcyBpbnNlcnRlZC5cbiAgICB2YXIgZW1iZWRDb2RlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd3aWRnZXQnLCB7XG4gICAgICB1dWlkOiBidWZmZXJJdGVtTW9kZWwuZ2V0KCdpZCcpLFxuICAgICAgY29udGV4dDogaXRlbS50YXJnZXRDb250ZXh0LmdldCgnaWQnKSxcbiAgICB9KTtcbiAgICBlbWJlZENvZGUuc2V0QXR0cmlidXRlKCc8dmlld21vZGU+JywgJ2VkaXRvcicpO1xuICAgIHRoaXMuX2FkYXB0ZXIuaW5zZXJ0RW1iZWRDb2RlKGVtYmVkQ29kZSk7XG4gIH1cblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBlZGl0b3IgY29tbWFuZHMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgQ29tbWFuZEVtaXR0ZXIgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7U3luY0FjdGlvbkRpc3BhdGNoZXJ9IGRpc3BhdGNoZXJcbiAqICAgVGhlIGFjdGlvbiBkaXNwYXRjaGVyIHRvIHVzZSBmb3IgZGlzcGF0Y2hpbmcgY29tbWFuZHMuXG4gKiBAcGFyYW0ge0NvbnRleHRSZXNvbHZlcn0gY29udGV4dFJlc29sdmVyXG4gKiAgIFRoZSBjb250ZXh0IHJlc29sdmVyIHVzZWQgdG8gbG9va3VwIGNvbnRleHQgbW9kZWxzIGFzc29jaWF0ZWQgd2l0aFxuICogICBjb21tYW5kcy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkaXNwYXRjaGVyLCBjb250ZXh0UmVzb2x2ZXIpIHtcbiAgdGhpcy5fZGlzcGF0Y2hlciA9IGRpc3BhdGNoZXI7XG4gIHRoaXMuX2NvbnRleHRSZXNvbHZlciA9IGNvbnRleHRSZXNvbHZlcjtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBFeGVjdXRlcyBhbiBcImluc2VydFwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIG5ldyBpdGVtIHdpbGwgYmUgaW5zZXJ0ZWQgaW50by5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogICBUaGUgdHlwZSB0byBpbnNlcnQuIFRoaXMgaXMgb3B0aW9uYWwuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBpbnNlcnQ6IGZ1bmN0aW9uKHRhcmdldENvbnRleHRJZCwgdHlwZSkge1xuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgY29tbWFuZDogJ2luc2VydCcsXG4gICAgICB0YXJnZXRDb250ZXh0OiB0YXJnZXRDb250ZXh0SWQsXG4gICAgfTtcblxuICAgIGlmICh0eXBlKSB7XG4gICAgICBvcHRpb25zLnR5cGUgPSB0eXBlO1xuICAgIH1cblxuICAgIHRoaXMuX2V4ZWN1dGUoJ0lOU0VSVF9JVEVNJywgb3B0aW9ucyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIGFuIFwiZWRpdFwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIGJ1ZmZlciBpdGVtIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtSWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGJ1ZmZlciBpdGVtIHRvIGJlIGVkaXRlZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgb2YgaW5saW5lIGVkaXRzIHRvIGJlIHByZXNlcnZlZC4gU2VlIFdpZGdldE1vZGVsIGZvciB0aGUgZm9ybWF0IG9mXG4gICAqICAgaW5saW5lIGVkaXRzLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZWRpdDogZnVuY3Rpb24odGFyZ2V0Q29udGV4dElkLCBpdGVtSWQsIGVkaXRzKSB7XG4gICAgdGhpcy5fZXhlY3V0ZSgnRURJVF9JVEVNJywge1xuICAgICAgY29tbWFuZDogJ2VkaXQnLFxuICAgICAgdGFyZ2V0Q29udGV4dDogdGFyZ2V0Q29udGV4dElkLFxuICAgICAgaXRlbUlkOiBpdGVtSWQsXG4gICAgICBlZGl0czogZWRpdHNcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRXhlY3V0ZXMgYSBcInJlbmRlclwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIGJ1ZmZlciBpdGVtIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtSWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGJ1ZmZlciBpdGVtIHRvIGJlIHJlbmRlcmVkLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZWRpdHNcbiAgICogICBBIG1hcCBvZiBpbmxpbmUgZWRpdHMgdG8gYmUgcHJlc2VydmVkLiBTZWUgV2lkZ2V0TW9kZWwgZm9yIHRoZSBmb3JtYXQgb2ZcbiAgICogICBpbmxpbmUgZWRpdHMuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKHRhcmdldENvbnRleHRJZCwgaXRlbUlkLCBlZGl0cykge1xuICAgIHRoaXMuX2V4ZWN1dGUoJ1JFTkRFUl9JVEVNJywge1xuICAgICAgY29tbWFuZDogJ3JlbmRlcicsXG4gICAgICB0YXJnZXRDb250ZXh0OiB0YXJnZXRDb250ZXh0SWQsXG4gICAgICBpdGVtSWQ6IGl0ZW1JZCxcbiAgICAgIGVkaXRzOiBlZGl0c1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBFeGVjdXRlcyBhbiBcImR1cGxpY2F0ZVwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIG5ldyBpdGVtIHdpbGwgYmUgaW5zZXJ0ZWQgaW50by5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUNvbnRleHRJZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgY29udGV4dCB0aGUgaXRlbSBiZWluZyBkdXBsaWNhdGVkIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtSWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGJ1ZmZlciBpdGVtIHRvIGJlIGR1cGxpY2F0ZWQuXG4gICAqIEBwYXJhbSB7bWl4ZWR9IHdpZGdldElkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdGhhdCB3aWxsIGJlIHVwZGF0ZWQgdG8gcmVmZXJlbmNlIHRoZSBuZXdseSBjcmVhdGVkXG4gICAqICAgaXRlbS5cbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgb2YgaW5saW5lIGVkaXRzIHRvIGJlIHByZXNlcnZlZC4gU2VlIFdpZGdldE1vZGVsIGZvciB0aGUgZm9ybWF0IG9mXG4gICAqICAgaW5saW5lIGVkaXRzLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZHVwbGljYXRlOiBmdW5jdGlvbih0YXJnZXRDb250ZXh0SWQsIHNvdXJjZUNvbnRleHRJZCwgaXRlbUlkLCB3aWRnZXRJZCwgZWRpdHMpIHtcbiAgICB0aGlzLl9leGVjdXRlKCdEVVBMSUNBVEVfSVRFTScsIHtcbiAgICAgIGNvbW1hbmQ6ICdkdXBsaWNhdGUnLFxuICAgICAgdGFyZ2V0Q29udGV4dDogdGFyZ2V0Q29udGV4dElkLFxuICAgICAgc291cmNlQ29udGV4dDogc291cmNlQ29udGV4dElkLFxuICAgICAgaXRlbUlkOiBpdGVtSWQsXG4gICAgICB3aWRnZXQ6IHdpZGdldElkLFxuICAgICAgZWRpdHM6IGVkaXRzXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsIGNhbGxiYWNrIGZvciB0cmlnZ2VyaW5nIHRoZSBjb21tYW5kIHRvIGJlIHNlbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgVGhlIHR5cGUgb2YgY29tbWFuZCBiZWluZyBwZXJmb3JtZWQuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb21tYW5kXG4gICAqICAgVGhlIGNvbW1hbmQgZGF0YSB0byBiZSBwYXNzZWQgdG8gdGhlIGRpc3BhdGNoZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBfZXhlY3V0ZTogZnVuY3Rpb24odHlwZSwgY29tbWFuZCkge1xuICAgIHZhciBlZGl0b3JDb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldEVkaXRvckNvbnRleHQoKTtcbiAgICBjb21tYW5kLmVkaXRvckNvbnRleHQgPSBlZGl0b3JDb250ZXh0LnRvSlNPTigpO1xuICAgIGNvbW1hbmQuc2V0dGluZ3MgPSBlZGl0b3JDb250ZXh0LmdldCgnc2V0dGluZ3MnKTtcblxuICAgIGlmIChjb21tYW5kLmVkaXRzKSB7XG4gICAgICBjb21tYW5kLmVkaXRhYmxlQ29udGV4dHMgPSB7fTtcbiAgICAgIF8uZWFjaChjb21tYW5kLmVkaXRzLCBmdW5jdGlvbih2YWx1ZSwgY29udGV4dElkKSB7XG4gICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldChjb250ZXh0SWQpO1xuICAgICAgICBjb21tYW5kLmVkaXRhYmxlQ29udGV4dHNbY29udGV4dElkXSA9IGNvbnRleHQudG9KU09OKCk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG5cbiAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHR5cGUsIGNvbW1hbmQpO1xuICB9XG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIHRoZSBsb2dpYyBmb3IgY3JlYXRpbmcgd2lkZ2V0IG1vZGVscy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBXaWRnZXRNb2RlbCA9IHJlcXVpcmUoJy4uLy4uL01vZGVscy9XaWRnZXRNb2RlbCcpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSB3aWRnZXQgZmFjdG9yeS5cbiAqXG4gKiBAcGFyYW0ge0NvbnRleHRSZXNvbHZlcn0gY29udGV4dFJlc29sdmVyXG4gKiAgIEEgY29udGV4dCByZXNvbHZlciB0byB1c2UgZm9yIHJlc29sdmluZyB0aGUgc291cmNlIGFuZCB0YXJnZXQgY29udGV4dHMgZm9yXG4gKiAgIGEgd2lkZ2V0LlxuICogQHBhcmFtIHtFZGl0QnVmZmVySXRlbVJlZkZhY3Rvcnl9IGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeVxuICogICBUaGUgZWRpdCBidWZmZXIgaXRlbSByZWZlcmVuY2UgZmFjdG9yeSB0byBwYXNzIHRocm91Z2ggdG8gY3JlYXRlZCB3aWRnZXRzLlxuICogQHBhcmFtIHtzdHJpbmd9IHV1aWRBdHRyaWJ1dGVOYW1lXG4gKiAgIFRoZSBuYW1lIG9mIHRoZSB1dWlkIGF0dHJpYnV0ZSBvbiB0aGUgd2lkZ2V0IGVsZW1lbnQgdG8gcHVsbCBlZGl0IGJ1ZmZlclxuICogICBpdGVtIGlkcyBmcm9tIHRoZSBET00uXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGV4dFJlc29sdmVyLCBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnksIHV1aWRBdHRyaWJ1dGVOYW1lKSB7XG4gIHRoaXMuX2NvbnRleHRSZXNvbHZlciA9IGNvbnRleHRSZXNvbHZlcjtcbiAgdGhpcy5fZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5ID0gZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5O1xuICB0aGlzLl91dWlkQXR0cmlidXRlTmFtZSA9IHV1aWRBdHRyaWJ1dGVOYW1lO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgd2lkZ2V0IG1vZGVsIGJhc2VkIG9uIGRhdGEgcHJvdmlkZWQgYnkgdGhlIGVkaXRvci5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gd2lkZ2V0XG4gICAqICAgVGhpcyBpcyBhbnkgYXJiaXRyYXJ5IGRhdGEgdGhlIGVkaXRvciBpbXBsZW1lbnRhdGlvbiB3YW50cyB0byBhc3NvY2lhdGVcbiAgICogICB3aXRoIHRoZSB3aWRnZXQgbW9kZWwuIFRoaXMgbGV0cyB5b3UgYWNjZXNzIGVkaXRvci1zcGVjaWZpYyB3aWRnZXQgZGF0YVxuICAgKiAgIHN0cnVjdHVyZXMgZnJvbSB3aXRoaW4gdGhlIGVkaXRvciBhZGFwdGVyLlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIEEgdW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSB3aWRnZXQuIEluIG1vc3QgY2FzZXMsIGl0IG1ha2VzIHNlbnNlIHRvIHBhc3NcbiAgICogICB0aGlzIHRocm91Z2ggZGlyZWN0bHkgZnJvbSB0aGUgZmFjaWxpdHkgdGhhdCB0aGUgZWRpdG9yIHVzZWQgdG8gY3JlYXRlXG4gICAqICAgdGhlIHdpZGdldC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbFxuICAgKiAgIFRoZSB3aWRnZXQgZWxlbWVudC4gVGhpcyB3aWxsIGJlIHVzZWQgdG8gZGVyaXZlIHRoZSBjb250ZXh0IGJlaW5nXG4gICAqICAgaW5zZXJ0ZWQgaW50byAodGFyZ2V0Q29udGV4dCksIHRoZSBjb250ZXh0IHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyXG4gICAqICAgaXRlbSBjYW1lIGZyb20gKHNvdXJjZUNvbnRleHQpLCBhbmQgdGhlIHJlZmVyZW5jZWQgaXRlbSBpZC5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgVGhlIG5ld2x5IGNyZWF0ZWQgd2lkZ2V0IG1vZGVsLlxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbih3aWRnZXQsIGlkLCAkZWwpIHtcbiAgICB2YXIgc291cmNlQ29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5yZXNvbHZlU291cmNlQ29udGV4dCgkZWwpO1xuICAgIHZhciB0YXJnZXRDb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLnJlc29sdmVUYXJnZXRDb250ZXh0KCRlbCk7XG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeTogdGhpcy5fZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LFxuICAgICAgY29udGV4dFJlc29sdmVyOiB0aGlzLl9jb250ZXh0UmVzb2x2ZXIsXG4gICAgICB3aWRnZXQ6IHdpZGdldCxcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBXaWRnZXRNb2RlbCh7XG4gICAgICBpZDogaWQsXG4gICAgICBjb250ZXh0SWQ6IHRhcmdldENvbnRleHQuZ2V0KCdpZCcpLFxuICAgICAgaXRlbUlkOiAkZWwuYXR0cih0aGlzLl91dWlkQXR0cmlidXRlTmFtZSksXG4gICAgICBpdGVtQ29udGV4dElkOiBzb3VyY2VDb250ZXh0LmdldCgnaWQnKSxcbiAgICB9LCBvcHRpb25zKTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhIGNsYXNzIGZvciBzdG9yaW5nIHdpZGdldCB0cmFja2luZyBkYXRhLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgV2lkZ2V0TW9kZWwgPSByZXF1aXJlKCcuLi8uLi9Nb2RlbHMvV2lkZ2V0TW9kZWwnKSxcbiAgV2lkZ2V0Q29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uLy4uL0NvbGxlY3Rpb25zL1dpZGdldENvbGxlY3Rpb24nKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgV2lkZ2V0U3RvcmUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7RWRpdG9yQWRhcHRlcn0gYWRhcHRlclxuICogICBUaGUgZWRpdG9yIGFkYXB0ZXIgdGhhdCB3aWxsIGJlIHVzZWQgdG8gdGllIHRoZSBlZGl0b3Igd2lkZ2V0IHN0YXRlIHRvIHRoZVxuICogICBpbnRlcm5hbCB0cmFja2VkIHdpZGdldCBzdGF0ZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhZGFwdGVyKSB7XG4gIHRoaXMuX2FkYXB0ZXIgPSBhZGFwdGVyO1xuICB0aGlzLl92aWV3cyA9IHt9O1xuICB0aGlzLl93aWRnZXRDb2xsZWN0aW9uID0gbmV3IFdpZGdldENvbGxlY3Rpb24oKTtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwgQmFja2JvbmUuRXZlbnRzLCB7XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBtb2RlbCB0byB0aGUgd2lkZ2V0IHN0b3JlLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gd2lkZ2V0TW9kZWxcbiAgICogICBUaGUgd2lkZ2V0IG1vZGVsIHRvIGJlIHRyYWNrZWQsIG9yIGFuIGF0dHJpYnV0ZXMgb2JqZWN0IHRvIHVwZGF0ZSBhblxuICAgKiAgIGV4aXN0aW5nIG1vZGVsIHdpdGguIElmIGFuIGF0dHJpYnV0ZXMgb2JqZWN0IGlzIHByb3ZpZGVkLCBpdCBtdXN0IGhhdmUgYW5cbiAgICogICBpZCBhdHRyaWJ1dGUgYW5kIHRoZSBtb2RlIG11c3QgYWxyZWFkeSBiZSBpbiB0aGUgc3RvcmUuIE90aGVyd2lzZSBhblxuICAgKiAgIGVycm9yIHdpbGwgYmUgdGhyb3duLiBJZiBhIG1vZGVsIGlzIHByb3ZpZGVkIGFuZCBiZWxvbmdzIHRvIGEgY29sbGVjdGlvbixcbiAgICogICBpdCBtdXN0IGJlbG9uZyB0byB0aGUgd2lkZ2V0IHN0b3JlIGluc3RhbmNlIGNvbGxlY3Rpb24uIE90aGVyd2lzZSBhblxuICAgKiAgIGVycm9yIHdpbGwgYmUgdGhyb3duLlxuICAgKiBAcGFyYW0ge0JhY2tib25lLlZpZXd9IHdpZGdldFZpZXdcbiAgICogICBBbiBvcHRpb25hbCB2aWV3IGNvcnJlc3BvbmRpbmcgdG8gdGhlIHdpZGdldCdzIERPTSBlbGVtZW50LCBpZiBvbmVcbiAgICogICBleGlzdHMuIFRoaXMgd2lsbCBiZSB1c2VkIHRvIHRyYWNrIHdoZXRoZXIgdGhlIHdpZGdldCBpcyBwcmVzZW50IGluIHRoZVxuICAgKiAgIERPTSBhbmQgaWYgaXQgZ2V0cyBvcnBoYW5lZC5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgVGhlIGFkZGVkIG1vZGVsLlxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbih3aWRnZXRNb2RlbCwgd2lkZ2V0Vmlldykge1xuICAgIGlmICghKHdpZGdldE1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuTW9kZWwpKSB7XG4gICAgICB2YXIgYXR0cmlidXRlcyA9IHdpZGdldE1vZGVsO1xuICAgICAgd2lkZ2V0TW9kZWwgPSB0aGlzLl93aWRnZXRDb2xsZWN0aW9uLmdldChhdHRyaWJ1dGVzLmlkKTtcbiAgICAgIGlmICghd2lkZ2V0TW9kZWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdHRlbXB0IHRvIHVwZGF0ZSBhbiB1bmtub3duIHdpZGdldC4nKTtcbiAgICAgIH1cbiAgICAgIHdpZGdldE1vZGVsLnNldChhdHRyaWJ1dGVzKTtcbiAgICB9XG5cbiAgICBpZiAod2lkZ2V0TW9kZWwuY29sbGVjdGlvbikge1xuICAgICAgaWYgKHdpZGdldE1vZGVsLmNvbGxlY3Rpb24gIT09IHRoaXMuX3dpZGdldENvbGxlY3Rpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgd2lkZ2V0IGJlaW5nIGFkZGVkIGFscmVhZHkgYmVsb25ncyB0byBhbm90aGVyIGVkaXRvci4nKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLmxpc3RlblRvKHdpZGdldE1vZGVsLCAnZGVzdHJveScsIHRoaXMuX3JlbW92ZVdyYXBwZXIpO1xuICAgICAgdGhpcy5saXN0ZW5Ubyh3aWRnZXRNb2RlbCwgJ2NoYW5nZTppdGVtSWQnLCB0aGlzLl91cGRhdGVJdGVtUmVmZXJlbmNlKTtcbiAgICAgIHRoaXMuX3dpZGdldENvbGxlY3Rpb24uYWRkKHdpZGdldE1vZGVsKTtcbiAgICB9XG5cbiAgICBpZiAod2lkZ2V0Vmlldykge1xuICAgICAgdmFyIGkgPSB3aWRnZXRNb2RlbC5nZXQoJ2l0ZW1JZCcpO1xuICAgICAgdmFyIGogPSB3aWRnZXRNb2RlbC5nZXQoJ2lkJyk7XG4gICAgICBpZiAoIXRoaXMuX3ZpZXdzW2ldKSB7XG4gICAgICAgIHRoaXMuX3ZpZXdzW2ldID0ge307XG4gICAgICB9XG4gICAgICB0aGlzLl92aWV3c1tpXVtqXSA9IHdpZGdldFZpZXc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdpZGdldE1vZGVsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIGEgd2lkZ2V0IG1vZGVsLCB2aWV3IHBhaXIgYmFzZWQgb24gaXRzIHdpZGdldCBpZC5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgaWQgb2YgdGhlIHdpZGdldCB0byBnZXQuXG4gICAqIEBwYXJhbSB7Ym9vbH0gbW9kZWxPbmx5XG4gICAqICAgU2V0IHRvIHRydWUgdG8gc2tpcCBlZGl0b3IgdmlldyBsb29rdXAuIFRoaXMgc2hvdWxkIGJlIHVzZWQgZm9yXG4gICAqICAgcmVhZC1vbmx5IGFjY2VzcyB0byB0aGUgbW9kZWwgc2luY2UgdGhpcyBtZXRob2QgaGFzIHRoZSBzaWRlLWVmZmVjdCBvZlxuICAgKiAgIGNsZWFuaW5nIHVwIHRoZSByZWZlcmVuY2UgdGFibGUgaWYgdGhlIHZpZXcgaXMgbm90IGZvdW5kIGluIHRoZSBET00uXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICogICBBbiBvYmplY3Qgd2l0aCBrZXlzICdtb2RlbCcgYW5kICd2aWV3Jywgd2hpY2ggYXJlIHJlc3BlY3RpdmVseSB0aGUgbW9kZWxcbiAgICogICBhbmQgdmlldyBvYmplY3RzIGFzc29jaWF0ZWQgd2l0aCB0aGUgd2lkZ2V0IGlkLiBJZiBlaXRoZXIgY2Fubm90IGJlXG4gICAqICAgZm91bmQsIHRoZSB2YWx1ZSBpbiB0aGUgcmVzcGVjdGl2ZSBrZXkgaXMgbnVsbC5cbiAgICovXG4gIGdldDogZnVuY3Rpb24oaWQsIG1vZGVsT25seSkge1xuICAgIHZhciB3aWRnZXRNb2RlbCA9IHRoaXMuX3dpZGdldENvbGxlY3Rpb24uZ2V0KGlkKTtcbiAgICBpZiAod2lkZ2V0TW9kZWwgJiYgIW1vZGVsT25seSkge1xuICAgICAgdmFyIGkgPSB3aWRnZXRNb2RlbC5nZXQoJ2l0ZW1JZCcpO1xuICAgICAgdmFyIGogPSB3aWRnZXRNb2RlbC5nZXQoJ2lkJyk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtb2RlbDogd2lkZ2V0TW9kZWwsXG4gICAgICAgIHZpZXc6IHRoaXMuX3JlYWRDZWxsKGksIGopLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbW9kZWw6IHdpZGdldE1vZGVsID8gd2lkZ2V0TW9kZWwgOiBudWxsLFxuICAgICAgdmlldzogbnVsbFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBtb2RlbCBmcm9tIHRoZSBzdG9yZS5cbiAgICpcbiAgICogSWYgdGhlIHdpZGdldCBoYXMgbm90IGFscmVhZHkgYmVlbiBtYXJrZWQgYXMgZGVzdHJveWVkIGJ5IHRoZSBlZGl0b3IsIHRoaXNcbiAgICogbWV0aG9kIHdpbGwgYWxzbyB0cmlnZ2VyIHdpZGdldCBkZXN0cnVjdGlvbiB3aXRoaW4gdGhlIGVkaXRvciB0aHJvdWdoIHRoZVxuICAgKiBlZGl0b3IgYWRhcHRlci5cbiAgICpcbiAgICogQHBhcmFtIHtXaWRnZXRNb2RlbH0gd2lkZ2V0TW9kZWxcbiAgICogICBUaGUgd2lkZ2V0IG1vZGVsIHRvIGJlIHJlbW92ZWQgZnJvbSB0aGUgc3RvcmUuXG4gICAqIEBwYXJhbSB7Ym9vbH0gc2tpcERlc3Ryb3lcbiAgICogICBBbGxvd3MgdGhlIGNsaWVudCB0byBzdG9wIHRyYWNraW5nIGEgd2lkZ2V0IHdpdGhvdXQgYWN0dWFsbHkgdHJpZ2dlcmluZ1xuICAgKiAgIHRoZSBkZXN0cnVjdGlvbiBvZiB0aGF0IHdpZGdldCB3aXRoaW4gdGhlIGVkaXRvci4gUGFzcyB0cnVlIHRvIGF2b2lkXG4gICAqICAgZGVzdHJveWluZyB0aGUgZWRpdG9yIHdpZGdldC4gQnkgZGVmYXVsdCwgY2FsbGluZyB0aGlzIG1ldGhvZCB3aWxsXG4gICAqICAgdHJpZ2dlciB3aWRnZXQgZGVzdHJ1Y3Rpb24gd2l0aGluIHRoZSBlZGl0b3IgaWYgaXQgaGFzIG5vdCBhbHJlYWR5IGJlZW5cbiAgICogICBkZXN0cm95ZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge1dpZGdldE1vZGVsfVxuICAgKiAgIFRoZSB3aWRnZXQgbW9kZWwgdGhhdCB3YXMgZGVzdHJveWVkLlxuICAgKi9cbiAgcmVtb3ZlOiBmdW5jdGlvbih3aWRnZXRNb2RlbCwgc2tpcERlc3Ryb3kpIHtcbiAgICBpZiAoIXdpZGdldE1vZGVsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGkgPSB3aWRnZXRNb2RlbC5nZXQoJ2l0ZW1JZCcpO1xuICAgIHZhciBqID0gd2lkZ2V0TW9kZWwuZ2V0KCdpZCcpO1xuXG4gICAgLy8gSWYgdGhlIHdpZGdldCBoYXMgbm90IGFscmVhZHkgYmVlbiBkZXN0cm95ZWQgd2l0aGluIHRoZSBlZGl0b3IsIHRoZW5cbiAgICAvLyByZW1vdmluZyBpdCBoZXJlIHRyaWdnZXJzIGl0cyBkZXN0cnVjdGlvbi4gV2UgcHJvdmlkZSB0aGUgY2FsbGVyIHRoZVxuICAgIC8vIGFiaWxpdHkgdG8gc2lkZXN0ZXAgdGhpcyBzaWRlIGVmZmVjdCB3aXRoIHRoZSBza2lwRGVzdHJveSBvcHQtb3V0LlxuICAgIGlmICghd2lkZ2V0TW9kZWwuaGFzU3RhdGUoV2lkZ2V0TW9kZWwuU3RhdGUuREVTVFJPWUVEX1dJREdFVCkgJiYgIXNraXBEZXN0cm95KSB7XG4gICAgICB0aGlzLl9hZGFwdGVyLmRlc3Ryb3lXaWRnZXQod2lkZ2V0TW9kZWwuZ2V0KCdpZCcpKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBjdXJyZW50bHkgYSB2aWV3IGFzc29jYWl0ZWQgd2l0aCB0aGUgd2lkZ2V0LCB0aGVuIGRlc3Ryb3kgaXQuXG4gICAgaWYgKHRoaXMuX3ZpZXdzW2ldICYmIHRoaXMuX3ZpZXdzW2ldW2pdKSB7XG4gICAgICB2YXIgdmlldyA9IHRoaXMuX3ZpZXdzW2ldW2pdO1xuICAgICAgZGVsZXRlIHRoaXMuX3ZpZXdzW2ldW2pdO1xuICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdGhlIHdpZGdldCBmcm9tIHRoZSBpbnRlcm5hbCBjb2xsZWN0aW9uLCBwZXJmb3JtIG1lbW9yeSBjbGVhbnVwLFxuICAgIC8vIGFuZCBtYXJrIHRoZSB3aWRnZXQgbW9kZWwgYXMgbm8gbG9uZ2VyIGJlaW5nIHRyYWNrZWQuXG4gICAgdGhpcy5fY2xlYW5Sb3coaSk7XG4gICAgdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbi5yZW1vdmUod2lkZ2V0TW9kZWwpO1xuICAgIHdpZGdldE1vZGVsLnNldFN0YXRlKFdpZGdldE1vZGVsLlN0YXRlLkRFU1RST1lFRF9SRUZTKTtcblxuICAgIHJldHVybiB3aWRnZXRNb2RlbDtcbiAgfSxcblxuICAvKipcbiAgICogQ291bnRzIHRoZSBudW1iZXIgb2YgZGlmZmVyZW50IHdpZGdldHMgdGhhdCByZWZlcmVuY2UgdGhlIHNhbWUgYnVmZmVyIGl0ZW0uXG4gICAqXG4gICAqIEBwYXJhbSB7V2lkZ2V0TW9kZWx9IHdpZGdldE1vZGVsXG4gICAqICAgQSB3aWRnZXQgbW9kZWwgdG8gY291bnQgdGhlIGJ1ZmZlciBpdGVtIHJlZmVyZW5jZXMgZm9yLiBUaGlzIGZ1bmN0aW9uXG4gICAqICAgd2lsbCByZXR1cm4gdGhlIHRvdGFsIG51bWJlciBvZiB3aWRnZXRzIHRoYXQgcmVmZXJlbmNlIHRoZSBidWZmZXIgaXRlbVxuICAgKiAgIGdpdmVuIGJ5IHRoZSBpdGVtSWQgYXR0cmlidXRlIG9uIHRoZSB3aWRnZXQgbW9kZWwsIGluY2x1ZGluZyB0aGUgcGFzc2VkXG4gICAqICAgd2lkZ2V0IGl0ZXNlbGYuXG4gICAqXG4gICAqIEByZXR1cm4ge2ludH1cbiAgICogICBUaGUgbnVtYmVyIG9mIHdpZGdldHMgcmVmZXJlbmNpbmcgdGhlIGl0ZW0gc3BlY2lmaWVkIGJ5IHRoZSBwYXNzZWQgd2lkZ2V0XG4gICAqICAgbW9kZWwncyByZWZlcmVuY2VkIGl0ZW0uXG4gICAqL1xuICBjb3VudDogZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICB2YXIgY291bnQgPSAwO1xuXG4gICAgaWYgKHdpZGdldE1vZGVsKSB7XG4gICAgICB2YXIgaSA9IHdpZGdldE1vZGVsLmdldCgnaXRlbUlkJyk7XG4gICAgICBmb3IgKHZhciBqIGluIHRoaXMuX3ZpZXdzW2ldKSB7XG4gICAgICAgIGlmICh0aGlzLl9yZWFkQ2VsbChpLCBqKSkge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY291bnQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIHRoZSBkZXN0cnVjdGlvbiBvZiBhbGwgdHJhY2tlZCB3aWRnZXRzIGFuZCBkYXRhIHN0cnVjdHVyZXMuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgY2xlYW51cDogZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLl92aWV3cykge1xuICAgICAgZm9yICh2YXIgaiBpbiB0aGlzLl92aWV3c1tpXSkge1xuICAgICAgICB0aGlzLl92aWV3c1tpXVtqXS5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLl92aWV3c1tpXTtcbiAgICB9XG4gICAgdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbi5yZXNldCgpO1xuICAgIHRoaXMuX2FkYXB0ZXIuY2xlYW51cCgpO1xuICAgIHJldHVybiB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgfSxcblxuICAvKipcbiAgICogU2FmZWx5IHJldHJpZXZlcyBhIHZpZXcgZnJvbSB0aGUgdGFibGUgaWYgcG9zc2libGUuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpXG4gICAqICAgVGhlIHJvdyAoYnVmZmVyIGl0ZW0gaWQpIGluIHRoZSB2aWV3IHRhYmxlIHRvIHJlYWQgZnJvbS5cbiAgICogQHBhcmFtIHtpbnR9IGpcbiAgICogICBUaGUgY29sdW1uICh3aWRnZXQgaWQpIGluIHRoZSB2aWV3IHRhYmxlIHRvIHJlYWQgZnJvbS5cbiAgICpcbiAgICogQHJldHVybiB7QmFja2JvbmUuVmlld31cbiAgICogICBBIHZpZXcgb2JqZWN0IGlmIG9uZSBleGlzdHMgaW4gdGhlIHZpZXcgdGFibGUgaXQgKGksaiksIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgX3JlYWRDZWxsOiBmdW5jdGlvbihpLCBqKSB7XG4gICAgdmFyIHZpZXcgPSBudWxsO1xuXG4gICAgaWYgKHRoaXMuX3ZpZXdzW2ldICYmIHRoaXMuX3ZpZXdzW2ldW2pdKSB7XG4gICAgICB2aWV3ID0gdGhpcy5fdmlld3NbaV1bal07XG4gICAgICBpZiAoIXRoaXMuX2FkYXB0ZXIuZ2V0Um9vdEVsKCkuY29udGFpbnModmlldy5lbCkpIHtcbiAgICAgICAgdGhpcy5yZW1vdmUodmlldy5tb2RlbCk7XG4gICAgICAgIHZpZXcgPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2aWV3O1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZWNsYWltcyBzcGFjZSBmcm9tIGFuIHVudXNlZCByb3cuXG4gICAqXG4gICAqIFRoaXMgaXMgY2FsbGVkIGFmdGVyIHBlcmZvcm1pbmcgZW50cnkgcmVtb3ZhbHMgdG8gZGVsZXRlIHJvd3MgaW4gdGhlIHZpZXdcbiAgICogdGFibGUgb25jZSB0aGV5IGJlY29tZSBlbXB0eS5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlcbiAgICogICBUaGUgcm93IGluIHRoZSB2aWV3IHRhYmxlIHRvIGNoZWNrIGZvciBjbGVhbnVwLiBJZiB0aGlzIHJvdyBpcyBlbXB0eSwgaXRcbiAgICogICB3aWxsIGJlIHJlbW92ZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBfY2xlYW5Sb3c6IGZ1bmN0aW9uKGkpIHtcbiAgICBpZiAodGhpcy5fdmlld3NbaV0gJiYgXy5pc0VtcHR5KHRoaXMuX3ZpZXdzW2ldKSkge1xuICAgICAgZGVsZXRlIHRoaXMuX3ZpZXdzW2ldO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgd2lkZ2V0IHRhYmxlIHdoZW4gYSB3aWRnZXQncyByZWZlcmVuY2VkIGl0ZW0gaGFzIGNoYW5nZWQuXG4gICAqXG4gICAqIFRoaXMgZW5zdXJlcyB0aGF0IHdoZW4gYSBidWZmZXIgaXRlbSBpcyBkdXBsaWNhdGVkIGZvciBhIHdpZGdldCwgYW5kIHRoZVxuICAgKiB3aWRnZXQgZ2V0cyB1cGRhdGVkIHRvIHBvaW50IHRvIHRoZSBuZXcgaXRlbSwgdGhlIHZpZXcgdGFibGUgaXMgdXBkYXRlZCB0b1xuICAgKiByZWZsZWN0IHRoZSBjaGFuZ2UuIEluIHBhcnRpY3VsYXIgdGhpcyBtZWFucyBtb3ZpbmcgdGhlIGRhdGEgZnJvbSB0aGUgb2xkXG4gICAqIHRhYmxlIGVudHJ5IHRvIHRoZSBuZXcgdGFibGUgZW50cnkuXG4gICAqXG4gICAqIEBwYXJhbSB7V2lkZ2V0TW9kZWx9IHdpZGdldE1vZGVsXG4gICAqICAgVGhlIHdpZGdldCBtb2RlbCB0aGF0IGhhcyBoYWQgaXRzIGl0ZW1JZCBhdHRyaWJ1dGUgdXBkYXRlZC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF91cGRhdGVJdGVtUmVmZXJlbmNlOiBmdW5jdGlvbih3aWRnZXRNb2RlbCkge1xuICAgIHZhciBpID0gd2lkZ2V0TW9kZWwucHJldmlvdXMoJ2l0ZW1JZCcpO1xuICAgIHZhciBqID0gd2lkZ2V0TW9kZWwuZ2V0KCdpZCcpO1xuICAgIHZhciBrID0gd2lkZ2V0TW9kZWwuZ2V0KCdpdGVtSWQnKTtcblxuICAgIGlmICh0aGlzLl92aWV3c1tpXSAmJiB0aGlzLl92aWV3c1tpXVtqXSkge1xuICAgICAgaWYgKCF0aGlzLl92aWV3c1trXSkge1xuICAgICAgICB0aGlzLl92aWV3c1trXSA9IHt9O1xuICAgICAgfVxuICAgICAgdGhpcy5fdmlld3Nba11bal0gPSB0aGlzLl92aWV3c1tpXVtqXTtcbiAgICAgIGRlbGV0ZSB0aGlzLl92aWV3c1tpXVtqXTtcbiAgICB9XG5cbiAgICB0aGlzLl9jbGVhblJvdyhpKTtcbiAgfSxcblxuICBfcmVtb3ZlV3JhcHBlcjogZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICB0aGlzLnJlbW92ZSh3aWRnZXRNb2RlbCk7XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYSBjbGFzcyBmb3IgZ2VuZXJhdGluZyB3aWRnZXQgdmlld3MuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgV2lkZ2V0Vmlld0ZhY3Rvcnkgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudEZhY3Rvcnl9IGVsZW1lbnRGYWN0b3J5XG4gKiAgIFRoZSBlbGVtZW50IGZhY3RvcnkgdGhhdCB3aWxsIGJlIGluamVjdGVkIGludG8gY3JlYXRlZCB2aWV3cy5cbiAqIEBwYXJhbSB7RWRpdG9yQWRhcHRlcn0gYWRhcHRlclxuICogICBUaGUgZWRpdG9yIGFkYXB0ZXIgdGhhdCB3aWxsIGJlIGluamVjdGVkIGludG8gY3JlYXRlZCB2aWV3cy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgYWRhcHRlcikge1xuICB0aGlzLl9lbGVtZW50RmFjdG9yeSA9IGVsZW1lbnRGYWN0b3J5O1xuICB0aGlzLl9hZGFwdGVyID0gYWRhcHRlcjtcbiAgdGhpcy5fdmlld01vZGVzID0gW107XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgdmlldyBtb2RlLlxuICAgKlxuICAgKiBWaWV3IG1vZGVzIGNvcnJlc3BvbmQgdG8gc3BlY2lmaWMgdmlldyBwcm90b3R5cGVzLiBUaGlzIGFsbG93cyB3aWRnZXRzIHRvXG4gICAqIGJlIGRpc3BsYXllZCBpbiBkaWZmZXJlbnQgZm9ybXMuIEZvciB0aGUgcHVycG9zZXMgb2YgdGhlIHdpZGdldC1zeW5jXG4gICAqIGxpYnJhcnksIHRoaXMgZ2VuZXJhbGx5IG1lYW5zIHdlIGhhdmUgb25lICdlZGl0b3InIHZpZXcgbW9kZSB0aGF0IHRoZSB1c2VyXG4gICAqIHdpbGwgaW50ZXJhY3Qgd2l0aCBpbiB0aGUgd3lzaXd5ZywgYW5kIG9uZSBvciBtb3JlICdleHBvcnQnIHZpZXcgbW9kZShzKVxuICAgKiB0aGF0IHdpbGwgYmUgdXNlZCB0byB0cmFuc2Zvcm0gdXNlciBpbnB1dCBpbnRvIGEgZm9ybWF0IHRoYXQgaXMgZWFzaWVyIHRvXG4gICAqIHNhdmUuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2aWV3TW9kZVxuICAgKiAgIFRoZSBuYW1lIG9mIHRoZSB2aWV3IG1vZGUgYmVpbmcgcmVnaXN0ZXJlZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICAgKiAgIFRoZSBkZWZpbml0aW9uIG9mIHRoZSBvYmplY3QgYmVpbmcgcmVnaXN0ZXJlZC4gU2VlIGNvbmZpZy5qcyBmb3IgZXhhbXBsZXNcbiAgICogICBvZiB0aGUgZm9ybWF0IG9mIHRoaXMgb2JqZWN0LiBBdCBtaW5pbXVtLCBlYWNoIGRlZmluaXRpb24gbmVlZHMgYVxuICAgKiAgICdwcm90b3R5cGUnIGtleSB0aGF0IGlzIGEgQmFja2JvbmUuVmlldyBkZXNjZW5kZWQgdHlwZS5cbiAgICpcbiAgICogQHJldHVybiB7b2JqZWN0fVxuICAgKiAgIFRoZSBwYXNzZWQgZGVmaXRpb24gaWYgbm8gZXJyb3JzIG9jY3VycmVkLlxuICAgKi9cbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uKHZpZXdNb2RlLCBkZWYpIHtcbiAgICBpZiAoIWRlZiB8fCAhZGVmLnByb3RvdHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaWV3IG1vZGUgcmVxdWlyZXMgYSB2aWV3IHByb3RvdHlwZS4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fdmlld01vZGVzW3ZpZXdNb2RlXSA9IGRlZjtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHZpZXcgZm9yIGEgd2lkZ2V0IG1vZGVsLlxuICAgKlxuICAgKiBAcGFyYW0ge1dpZGdldE1vZGVsfSB3aWRnZXRNb2RlbFxuICAgKiAgIFRoZSB3aWRnZXQgbW9kZWwgdG8gY3JlYXRlIHRoZSB2aWV3IGZvci5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbFxuICAgKiAgIEEgalF1ZXJ5IHdyYXBwZWQgZWxlbWVudCBmb3IgdGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHRoZSByb290IG9mIHRoZVxuICAgKiAgIHZpZXcuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2aWV3TW9kZVxuICAgKiAgIFRoZSB2aWV3IG1vZGUgdG8gY3JlYXRlIGZvciB0aGUgd2lkZ2V0LiBUaGlzIHdpbGwgYmUgdXNlZCB0byBkZXRlcm1pbmVcbiAgICogICB3aGljaCB2aWV3IHByb3RvdHlwZSBpcyB1c2VkIHRvIGluc3RhbnRpYXRlIHRoZSB2aWV3LiB2aWV3TW9kZSBtdXN0IGhhdmVcbiAgICogICBwcmV2aW91c2x5IGJlZW4gcmVnaXN0ZXJlZCB0aHJvdWdoIHRoZSByZWdpc3RlciBtZXRob2QuXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLlZpZXd9XG4gICAqICAgVGhlIG5ld2x5IGNyZWF0ZWQgdmlldyBvYmplY3QuXG4gICAqL1xuICBjcmVhdGU6IGZ1bmN0aW9uKHdpZGdldE1vZGVsLCAkZWwsIHZpZXdNb2RlKSB7XG4gICAgaWYgKCF2aWV3TW9kZSkge1xuICAgICAgdmlld01vZGUgPSB3aWRnZXRNb2RlbC5nZXQoJ3ZpZXdNb2RlJyk7XG4gICAgfVxuXG4gICAgdmFyIGRlZiA9IHRoaXMuX3ZpZXdNb2Rlc1t2aWV3TW9kZV07XG4gICAgaWYgKCFkZWYpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB2aWV3IG1vZGUgXCInICsgdmlld01vZGUgKyAnXCInKTtcbiAgICB9XG5cbiAgICB2YXIgb3B0aW9ucyA9IGRlZi5vcHRpb25zID8gZGVmLm9wdGlvbnMgOiB7fTtcblxuICAgIHJldHVybiBuZXcgZGVmLnByb3RvdHlwZShfLmV4dGVuZCh7XG4gICAgICBtb2RlbDogd2lkZ2V0TW9kZWwsXG4gICAgICBhZGFwdGVyOiB0aGlzLl9hZGFwdGVyLFxuICAgICAgZWxlbWVudEZhY3Rvcnk6IHRoaXMuX2VsZW1lbnRGYWN0b3J5LFxuICAgICAgZWw6ICRlbC5nZXQoMCksXG4gICAgfSwgb3B0aW9ucykpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgdmlldyBmb3IgYSB3aWRnZXQgbW9kZWwsIGFuZCBibG9ja3MgaXRzIGV2ZW50IGhhbmRsZXJzLlxuICAgKlxuICAgKiBCeSBkZWZhdWx0LCB2aWV3cyBhcmUgY3JlYXRlZCB3aXRoIGEgbG9uZy10ZXJtIGxpZmVjeWNsZSBpbiBtaW5kLiBUaGV5XG4gICAqIGF0dGFjaCB0aGVtc2VsdmVzIHRvIHRoZSBET00sIGxpc3RlbiBmb3IgY2hhbmdlcyB0byB0aGUgbW9kZWwsIGFuZCB1cGRhdGVcbiAgICogdGhlIERPTS5cbiAgICpcbiAgICogSW4gY2VydGFpbiBjYXNlcywgd2UgZGVzaXJlIHRvIGNyZWF0ZSBhIHZpZXcgc2ltcGx5IHRvIHVzZSBpdHMgbWFya3VwXG4gICAqIHByb2Nlc3NpbmcgbG9naWMuIFdlIGRvIHRoaXMgaW4gb3JkZXIgdG8gdHJhbnNmb3JtIG1hcmt1cCBpbnRvIGFwcGxpY2F0aW9uXG4gICAqIHN0YXRlLlxuICAgKlxuICAgKiBJZiB3ZSBzaW1wbHkgdXNlIHRoZSBjcmVhdGUgbWV0aG9kIGluIHRoaXMgY2FzZSwgdmlld3MgY2FuIHByZXZlbnRcbiAgICogdGhlbXNlbHZlcyBmcm9tIGJlaW5nIGRlc3Ryb3llZCwgYW5kIGNhbiBjYXVzZSB1bndhbnRlZCBzaWRlLWVmZmVjdHMgYnlcbiAgICogYXR0YWNoaW5nIHRoZWlyIG93biBub3RpZmljYXRpb24gaGFuZGxlcnMgdG8gdGhlIG1vZGVsLiBUbyBwcmV2ZW50IHRoaXMsIFxuICAgKiB3ZSB1c2UgdGhpcyBtZXRob2QgdG8gY3JlYXRlIGEgc2hvcnQtdGVybSBsaWZlY3ljbGUgdmlldyB0aGF0IGNhbiBiZVxuICAgKiBkaXNjYXJkZWQgd2l0aG91dCBzaWRlLWVmZmVjdHMuXG4gICAqXG4gICAqIEBwYXJhbSB7V2lkZ2V0TW9kZWx9IHdpZGdldE1vZGVsXG4gICAqICAgVGhlIHdpZGdldCBtb2RlbCB0byBjcmVhdGUgdGhlIHZpZXcgZm9yLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsXG4gICAqICAgQSBqUXVlcnkgd3JhcHBlZCBlbGVtZW50IGZvciB0aGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdGhlIHJvb3Qgb2YgdGhlXG4gICAqICAgdmlldy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHZpZXdNb2RlXG4gICAqICAgVGhlIHZpZXcgbW9kZSB0byBjcmVhdGUgZm9yIHRoZSB3aWRnZXQuIFRoaXMgd2lsbCBiZSB1c2VkIHRvIGRldGVybWluZVxuICAgKiAgIHdoaWNoIHZpZXcgcHJvdG90eXBlIGlzIHVzZWQgdG8gaW5zdGFudGlhdGUgdGhlIHZpZXcuIHZpZXdNb2RlIG11c3QgaGF2ZVxuICAgKiAgIHByZXZpb3VzbHkgYmVlbiByZWdpc3RlcmVkIHRocm91Z2ggdGhlIHJlZ2lzdGVyIG1ldGhvZC5cbiAgICpcbiAgICogQHJldHVybiB7QmFja2JvbmUuVmlld31cbiAgICogICBUaGUgbmV3bHkgY3JlYXRlZCB2aWV3IG9iamVjdCwgd2l0aCBhbGwgbGlzdGVuZXJzIHJlbW92ZWQuXG4gICAqL1xuICBjcmVhdGVUZW1wb3Jhcnk6IGZ1bmN0aW9uKHdpZGdldE1vZGVsLCAkZWwsIHZpZXdNb2RlKSB7XG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlKHdpZGdldE1vZGVsLCAkZWwsIHZpZXdNb2RlKS5zdG9wTGlzdGVuaW5nKCk7XG4gIH1cblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBjb21tYW5kcyBmcm9tIHRoZSBxdWV1ZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqIEFic3RyYWN0IHJlcHJlc2VudGF0aW9uIG9mIGFuIEhUTUwgZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnXG4gKiAgIFRoZSBodG1sIHRhZyBuYW1lIG9mIHRoZSBlbGVtZW50LlxuICogQHBhcmFtIHtvYmplY3R9IGF0dHJpYnV0ZU1hcFxuICogICBBIG1hcHBpbmcgb2YgYXR0cmlidXRlcyBmb3IgdGhlIGVsZW1lbnQuIEtleXMgYXJlIGF0dHJpYnV0ZSBuYW1lcyBhbmRcbiAqICAgdmFsdWVzIGFyZSBlaXRoZXIgaGFyZC1jb2RlZCBhdHRyaWJ1dGUgdmFsdWVzIG9yIGRhdGEgcmVmZXJlbmNlcyBpbiB0aGVcbiAqICAgZm9yICc8ZGF0YWtleW5hbWU+Jy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvclxuICogICBBIHNlbGVjdG9yIGZvciBmaW5kaW5nIGVsZW1lbnRzIG9mIHRoaXMgdHlwZS5cbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhXG4gKiAgIERhdGEgdG8gYXNzb2NpYXRlIHdpdGggZWFjaCBhdHRyaWJ1dGUgaW4gdGhlIGF0dHJpYnV0ZSBtYXAuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFnLCBhdHRyaWJ1dGVNYXAsIHNlbGVjdG9yLCBkYXRhKSB7XG4gIHZhciBlbGVtZW50ID0gdGhpcztcblxuICBpZiAoIWF0dHJpYnV0ZU1hcCkge1xuICAgIGF0dHJpYnV0ZU1hcCA9IHt9O1xuICB9XG5cbiAgdGhpcy5fdGFnID0gdGFnO1xuICB0aGlzLl9hdHRyaWJ1dGVNYXAgPSBhdHRyaWJ1dGVNYXA7XG4gIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG4gIHRoaXMuX2ludmVydGVkQXR0cmlidXRlTWFwID0ge307XG4gIF8uZWFjaChhdHRyaWJ1dGVNYXAsIGZ1bmN0aW9uKGF0dHJpYnV0ZV92YWx1ZSwgYXR0cmlidXRlX25hbWUpIHtcbiAgICBlbGVtZW50Ll9pbnZlcnRlZEF0dHJpYnV0ZU1hcFtlbGVtZW50Ll9nZXREYXRhS2V5KGF0dHJpYnV0ZV92YWx1ZSldID0gYXR0cmlidXRlX25hbWU7XG4gIH0pO1xuXG4gIGlmICghZGF0YSkge1xuICAgIGRhdGEgPSB7fTtcbiAgfVxuXG4gIHZhciBhdHRyaWJ1dGVzID0ge307XG4gIF8uZWFjaChhdHRyaWJ1dGVNYXAsIGZ1bmN0aW9uKGF0dHJpYnV0ZV92YWx1ZSwgYXR0cmlidXRlX25hbWUpIHtcbiAgICB2YXIgZGF0YUtleSA9IGVsZW1lbnQuX2dldERhdGFLZXkoYXR0cmlidXRlX3ZhbHVlKTtcbiAgICBpZiAoZGF0YUtleSkge1xuICAgICAgaWYgKGRhdGFbZGF0YUtleV0pIHtcbiAgICAgICAgYXR0cmlidXRlc1thdHRyaWJ1dGVfbmFtZV0gPSBkYXRhW2RhdGFLZXldO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGF0dHJpYnV0ZXNbYXR0cmlidXRlX25hbWVdID0gYXR0cmlidXRlX3ZhbHVlO1xuICAgIH1cbiAgfSk7XG5cbiAgdGhpcy5fYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXM7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogR2V0cyB0aGUgaHRtbCB0YWcgbmFtZSBvZiB0aGUgZWxlbWVudC5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKiAgIFRoZSBodG1sIHRhZyBuYW1lLlxuICAgKi9cbiAgZ2V0VGFnOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFnO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBhdHRyaWJ1dGVzIG9mIHRoZSBlbGVtZW50LlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqICAgQSBtYXAgd2hlcmUga2V5cyBhcmUgYXR0cmlidXRlIG5hbWVzIGFuZCB2YWx1ZXMgYXJlIHRoZSBhc3NvY2lhdGVkXG4gICAqICAgYXR0cmlidXRlIHZhbHVlcy5cbiAgICovXG4gIGdldEF0dHJpYnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9hdHRyaWJ1dGVzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBuYW1lcyBvZiB0aGUgYXR0cmlidXRlcyB0aGlzIGVsZW1lbnQgc3VwcG9ydHMuXG4gICAqXG4gICAqIEByZXR1cm4ge2FycmF5fVxuICAgKiAgIEFuIGFycmF5IG9mIGF0dHJpYnV0ZSBuYW1lcy5cbiAgICovXG4gIGdldEF0dHJpYnV0ZU5hbWVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy5rZXlzKHRoaXMuX2F0dHJpYnV0ZU1hcCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogICBFaXRoZXIgYSBoYXJkIGNvZGVkIGF0dHJpYnV0ZSBuYW1lIG9yIGEgZGF0YSByZWZlcmVuY2UgbmFtZSBpZiB0aGUgZm9ybVxuICAgKiAgICc8ZGF0YWtleW5hbWU+Jy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gICAqICAgVGhlIGF0dHJpYnV0ZSB2YWx1ZS4gTm90ZSB0aGF0IG9ubHkgc3RyaW5ncyBhcmUgc3VwcG9ydGVkIGhlcmUuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgc2V0QXR0cmlidXRlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuX2F0dHJpYnV0ZXNbdGhpcy5nZXRBdHRyaWJ1dGVOYW1lKG5hbWUpXSA9IHZhbHVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUgb24gdGhpcyBlbGVtZW50IGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiAgIEVpdGhlciBhIGhhcmQgY29kZWQgYXR0cmlidXRlIG5hbWUgb3IgYSBkYXRhIHJlZmVyZW5jZSBuYW1lIGlmIHRoZSBmb3JtXG4gICAqICAgJzxkYXRha2V5bmFtZT4nLlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqICAgVGhlIGF0dHJpYnV0ZSB2YWx1ZSBmb3IgdGhlIHJlcXVlc3RlZCBhdHRyaWJ1dGUuXG4gICAqL1xuICBnZXRBdHRyaWJ1dGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fYXR0cmlidXRlc1t0aGlzLmdldEF0dHJpYnV0ZU5hbWUobmFtZSldO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBuYW1lIG9mIGFuIGF0dHJpYnV0ZSBiYXNlZCBvbiBpdHMgZGF0YSBrZXkgZW50cnkgbmFtZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogICBBIGRhdGEga2V5IGVudHJ5IG5hbWUgaW4gdGhlIGZvcm0gJzxkYXRha2V5bmFtZT4nLlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqICAgVGhlIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZS4gUGFzc2VzIHRocm91Z2ggdGhlIG9yaWdpbmFsbHkgcGFzc2VkIG5hbWVcbiAgICogICBpZiBubyBkYXRhIGtleSBtYXRjaCB3YXMgZm91bmQuXG4gICAqL1xuICBnZXRBdHRyaWJ1dGVOYW1lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGRhdGFLZXkgPSB0aGlzLl9nZXREYXRhS2V5KG5hbWUpO1xuICAgIGlmIChkYXRhS2V5ICYmIHRoaXMuX2ludmVydGVkQXR0cmlidXRlTWFwW2RhdGFLZXldKSB7XG4gICAgICBuYW1lID0gdGhpcy5faW52ZXJ0ZWRBdHRyaWJ1dGVNYXBbZGF0YUtleV07XG4gICAgfVxuICAgIHJldHVybiBuYW1lO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW5kZXJzIHRoZSBvcGVuaW5nIHRhZyBmb3IgdGhlIGVsZW1lbnQuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICogICBUaGUgcmVuZGVyZWQgb3BlbmluZyB0YWcuXG4gICAqL1xuICByZW5kZXJPcGVuaW5nVGFnOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzdWx0ID0gJzwnICsgdGhpcy5nZXRUYWcoKTtcblxuICAgIF8uZWFjaCh0aGlzLmdldEF0dHJpYnV0ZXMoKSwgZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgIHJlc3VsdCArPSAnICcgKyBuYW1lICsgJz1cIicgKyB2YWx1ZSArICdcIic7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0ICsgJz4nO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW5kZXJzIHRoZSBjbG9zaW5nIHRhZyBmb3IgdGhlIGVsZW1lbnQuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICogICBUaGUgcmVuZGVyZWQgY2xvc2luZyB0YWcuXG4gICAqL1xuICByZW5kZXJDbG9zaW5nVGFnOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJzwvJyArIHRoaXMuZ2V0VGFnKCkgKyAnPic7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHNlbGVjdG9yIGZvciBmaW5kaW5nIGluc3RhbmNlcyBvZiB0aGlzIGVsZW1lbnQgaW4gdGhlIERPTS5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKiAgIFRoZSBzZWxlY3RvciBmb3IgdGhpcyBlbGVtZW50LlxuICAgKi9cbiAgZ2V0U2VsZWN0b3I6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhdHRyaWJ1dGVzID0gdGhpcy5nZXRBdHRyaWJ1dGVzKCk7XG4gICAgdmFyIHNlbGVjdG9yID0gJyc7XG5cbiAgICBpZiAodGhpcy5fc2VsZWN0b3IpIHtcbiAgICAgIHNlbGVjdG9yID0gdGhpcy5fc2VsZWN0b3I7XG4gICAgfVxuICAgIGVsc2UgaWYgKGF0dHJpYnV0ZXNbJ2NsYXNzJ10pIHtcbiAgICAgIHZhciBjbGFzc2VzID0gYXR0cmlidXRlc1snY2xhc3MnXS5zcGxpdCgnICcpO1xuICAgICAgXy5lYWNoKGNsYXNzZXMsIGZ1bmN0aW9uKGNsYXNzbmFtZSkge1xuICAgICAgICBzZWxlY3RvciArPSAnLicgKyBjbGFzc25hbWU7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZWxlY3RvciA9IHRoaXMuZ2V0VGFnKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlbGVjdG9yO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gcGFyc2UgZGF0YSBrZXkgYXR0cmlidXRlIG5hbWVzLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiAgIFRoZSBhdHRyaWJ1dGUgbmFtZSB0byBiZSBwYXJzZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICogICBUaGUgZGF0YSBrZXkgYXR0cmlidXRlIG5hbWUgKHdpdGhvdXQgZW5jbG9zaW5nICc8PicpIGlmIHRoZSBhdHRyaWJ1dGVcbiAgICogICBuYW1lIG1hdGNoZWQgdGhlIHBhdHRlcm4sIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIF9nZXREYXRhS2V5OiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHJlZ2V4ID0gL148KFthLXpcXC1dKyk+JC87XG4gICAgdmFyIHBhcnNlZCA9IHJlZ2V4LmV4ZWMobmFtZSk7XG4gICAgaWYgKHBhcnNlZCAmJiBwYXJzZWRbMV0pIHtcbiAgICAgIHJldHVybiBwYXJzZWRbMV07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIHRoZSBsb2dpYyBmb3IgZXhlY3V0aW5nIGNvbW1hbmRzIGZyb20gdGhlIHF1ZXVlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEVsZW1lbnQgPSByZXF1aXJlKCcuL0VsZW1lbnQnKTtcblxuLyoqXG4gKiBBIGZhY3RvcnkgZm9yIGNyZWF0aW5nIEVsZW1lbnQgb2JqZWN0cy5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZWxlbWVudHNcbiAqICAgRGVmaW5pdGlvbnMgb2YgZWxlbWVudCB0eXBlcyB0aGF0IGNhbiBiZSBjcmVhdGVkIGJ5IHRoaXMgZmFjdG9yeS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbGVtZW50cykge1xuICB0aGlzLl9lbGVtZW50cyA9IGVsZW1lbnRzO1xuXG4gIF8uZWFjaCh0aGlzLl9lbGVtZW50cywgZnVuY3Rpb24oZWxlbWVudCkge1xuICAgIGlmICghZWxlbWVudC5hdHRyaWJ1dGVzKSB7XG4gICAgICBlbGVtZW50LmF0dHJpYnV0ZXMgPSB7fTtcbiAgICB9XG4gIH0pO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gZWxlbWVudCBvYmplY3Qgd2l0aCBubyBkYXRhLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiAgIFRoZSB0eXBlIG9mIGVsZW1lbnQgdG8gZ2V0IGEgdGVtcGxhdGUgZm9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtFbGVtZW50fVxuICAgKiAgIFRoZSBjcmVhdGVkIGVsZW1lbnQgb2JqZWN0LCB3aXRoIG5vIGFkZGl0aW9uYWwgZGF0YS5cbiAgICovXG4gIGdldFRlbXBsYXRlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlKG5hbWUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVsZW1lbnQgaW5zdGFuY2Ugd2l0aCBzcGVjaWZpYyBkYXRhIGF0dHJpYnV0ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqICAgVGhlIHR5cGUgb2YgZWxlbWVudCB0byBjcmVhdGVkIGFzIGRlZmluZWQgaW4gdGhlIGNvbnN0cnVjdG9yLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YVxuICAgKiAgIFRoZSBkYXRhIHRvIHVzZSB0byBmaWxsIGluIHRoZSBlbGVtZW50IGF0dHJpYnV0ZXMgYmFzZWQgb24gdGhlIHR5cGVcbiAgICogICBkZWZpbml0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHtFbGVtZW50fVxuICAgKiAgIFRoZSBjcmVhdGVkIGVsZW1lbnQgb2JqZWN0LCB3aXRoIHRoZSBwYXNzZWQgYXR0cmlidXRlIGRhdGEgZmlsbGVkIGluLlxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG4gICAgdmFyIHRlbXBsYXRlID0gdGhpcy5fZWxlbWVudHNbbmFtZV07XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGVsZW1lbnQgdHlwZS4nKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBFbGVtZW50KHRlbXBsYXRlLnRhZywgdGVtcGxhdGUuYXR0cmlidXRlcywgdGVtcGxhdGUuc2VsZWN0b3IsIGRhdGEpO1xuICB9XG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYSBtb2RlbCBmb3IgcmVwcmVzZW50aW5nIGEgY29udGV4dC5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIEVkaXRCdWZmZXJJdGVtQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uL0NvbGxlY3Rpb25zL0VkaXRCdWZmZXJJdGVtQ29sbGVjdGlvbicpO1xuXG4vKipcbiAqIEJhY2tib25lIE1vZGVsIGZvciByZXByZXNlbnRpbmcgZWRpdG9yIHdpZGdldCBjb250ZXh0cy5cbiAqXG4gKiBBIGNvbnRleHQgaXMgYW4gZW52aXJvbm1lbnQgd2hlcmUgd2lkZ2V0cyBjYW4gYXBwZWFyLiBDb250ZXh0cyBsZXQgdXMga25vd1xuICogd2hvIG93bnMgdGhlIGRhdGEgaXQncyBhc3NvY2lhdGVkIHdpdGguIEVhY2ggZWRpdGFibGUgcmVnaW9uIHdpbGwgZ2V0IGl0c1xuICogb3duIGNvbnRleHQuIFdoZW4gYSB3aWRnZXQgdHJhdmVscyBmcm9tIG9uZSBjb250ZXh0IHRvIGFub3RoZXIgaXQgZmxhZ3MgdGhhdFxuICogdGhlIGRhdGEgZW50aXR5IHRoYXQgaXMgYXNzb2NpYXRlZCB3aXRoIHRoZSB3aWRnZXQgbmVlZHMgdG8gYmUgdXBkYXRlZC5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAYXVnbWVudHMgQmFja2JvbmUuTW9kZWxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG4gIHR5cGU6ICdDb250ZXh0JyxcblxuICBkZWZhdWx0czoge1xuICAgIG93bmVySWQ6ICcnLFxuICAgIGZpZWxkSWQ6ICcnLFxuICAgIHNjaGVtYUlkOiAnJyxcbiAgICBzZXR0aW5nczoge30sXG4gIH0sXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oYXR0cmlidXRlcywgb3B0aW9ucykge1xuICAgIHRoaXMuZWRpdEJ1ZmZlciA9IG5ldyBFZGl0QnVmZmVySXRlbUNvbGxlY3Rpb24oW10sIHsgY29udGV4dElkOiBhdHRyaWJ1dGVzLmlkIH0pO1xuICAgIEJhY2tib25lLk1vZGVsLmFwcGx5KHRoaXMsIFthdHRyaWJ1dGVzLCBvcHRpb25zXSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBzZXQ6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMsIG9wdGlvbnMpIHtcbiAgICBpZiAoYXR0cmlidXRlcy5lZGl0QnVmZmVySXRlbXMpIHtcbiAgICAgIHRoaXMuZWRpdEJ1ZmZlci5hZGQoYXR0cmlidXRlcy5lZGl0QnVmZmVySXRlbXMsIHttZXJnZTogdHJ1ZX0pO1xuICAgICAgZGVsZXRlIGF0dHJpYnV0ZXMuZWRpdEJ1ZmZlckl0ZW1zO1xuICAgIH1cblxuICAgIHZhciBvbGRJZCA9IHRoaXMuZ2V0KCdpZCcpO1xuICAgIHZhciBuZXdJZCA9IGF0dHJpYnV0ZXMuaWQ7XG4gICAgaWYgKG5ld0lkICYmIG9sZElkICYmIG5ld0lkICE9IG9sZElkKSB7XG4gICAgICB2YXIgY29sbGVjdGlvbiA9IHRoaXMuY29sbGVjdGlvbjtcbiAgICAgIGlmIChjb2xsZWN0aW9uKSB7XG4gICAgICAgIGNvbGxlY3Rpb24ucmVtb3ZlKHRoaXMsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMuaWQgPSB0aGlzLmlkID0gbmV3SWQ7XG4gICAgICAgIGNvbGxlY3Rpb24uYWRkKHRoaXMsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMuaWQgPSB0aGlzLmlkID0gb2xkSWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsIGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBIGNvbnZlbmllbmNlIGZ1bmN0aW9uIGZvciByZWFkaW5nIGFuIGluZGl2aWR1YWwgc2V0dGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICAgKiAgIFRoZSBzZXR0aW5ncyBrZXkgdG8gbG9va3VwLlxuICAgKlxuICAgKiBAcmV0dXJuIHttaXhlZH1cbiAgICogICBUaGUgc2V0dGluZyB2YWx1ZSB0aGF0IHdhcyByZWFkIG9yIHVuZGVmaW5lZCBpZiBubyBzdWNoIHNldHRpbmcgZXhpc3RlZC5cbiAgICovXG4gIGdldFNldHRpbmc6IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiB0aGlzLmdldCgnc2V0dGluZ3MnKVtrZXldO1xuICB9LFxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgbW9kZWwgZm9yIHJlcHJlc2VudGluZyBlZGl0IGJ1ZmZlciBpdGVtcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICogQmFja2JvbmUgIE1vZGVsIGZvciByZXByZXNlbnRpbmcgY29tbWFuZHMuXG4gKlxuICogVGhlIGlkIGZvciB0aGlzIG1vZGVsIGlzIHRoZSB1dWlkIG9mIGEgZGF0YSBlbnRpdHkgdGhhdCB0aGUgaXRlbVxuICogY29ycmVzcG9uZHMgdG8uXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnRWRpdEJ1ZmZlckl0ZW0nLFxuXG4gIC8qKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKlxuICAgKiBAcHJvcCBtYXJrdXBcbiAgICovXG4gIGRlZmF1bHRzOiB7XG5cbiAgICAnY29udGV4dElkJzogJycsXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGUgaXRlbSBpcyByZWFkeSB0byBiZSBpbnNlcnRlZC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgJ2luc2VydCc6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGl0ZW0gbWFya3VwLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICAnbWFya3VwJzogJy4uLicsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaXRlbSBtYXJrdXAuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgICd0eXBlJzogJycsXG5cbiAgICAnZmllbGRzJzoge31cbiAgfSxcblxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnRWRpdG9yJyxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMsIGNvbmZpZykge1xuICAgIHRoaXMud2lkZ2V0RmFjdG9yeSA9IGNvbmZpZy53aWRnZXRGYWN0b3J5O1xuICAgIHRoaXMudmlld0ZhY3RvcnkgPSBjb25maWcudmlld0ZhY3Rvcnk7XG4gICAgdGhpcy53aWRnZXRTdG9yZSA9IGNvbmZpZy53aWRnZXRTdG9yZTtcbiAgICB0aGlzLmVkaXRCdWZmZXJNZWRpYXRvciA9IGNvbmZpZy5lZGl0QnVmZmVyTWVkaWF0b3I7XG4gICAgdGhpcy5jb250ZXh0ID0gY29uZmlnLmNvbnRleHQ7XG4gICAgdGhpcy5jb250ZXh0UmVzb2x2ZXIgPSBjb25maWcuY29udGV4dFJlc29sdmVyO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb250ZXh0LCAnY2hhbmdlOmlkJywgdGhpcy5fdXBkYXRlQ29udGV4dElkKTtcbiAgfSxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIHRoaXMud2lkZ2V0U3RvcmUuY2xlYW51cCgpO1xuICAgIHRoaXMuZWRpdEJ1ZmZlck1lZGlhdG9yLmNsZWFudXAoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hhbmdlIGhhbmRsZXIgZm9yIGEgY29udGV4dCBpZCBjaGFuZ2UuXG4gICAqXG4gICAqIEBwYXJhbSB7QmFja2JvbmUuTW9kZWx9IGNvbnRleHRNb2RlbFxuICAgKiAgIFRoZSBjb250ZXh0IG1vZGVsIHRoYXQgaGFzIGhhZCBhbiBpZCBjaGFuZ2UuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBfdXBkYXRlQ29udGV4dElkOiBmdW5jdGlvbihjb250ZXh0TW9kZWwpIHtcbiAgICB0aGlzLnNldCh7IGlkOiBjb250ZXh0TW9kZWwuZ2V0KCdpZCcpIH0pO1xuICB9XG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSBtb2RlbCBmb3IgcmVwcmVzZW50aW5nIGEgc2NoZW1hIGVudHJ5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuLyoqXG4gKiBCYWNrYm9uZSAgTW9kZWwgZm9yIHJlcHJlc2VudGluZyBhIHNjaGVtYSBlbnRyeS5cbiAqXG4gKiBUaGUgaWQgZm9yIHRoaXMgbW9kZWwgaXMgdGhlIHV1aWQgb2YgYSBkYXRhIGVudGl0eSB0aGF0IHRoZSBpdGVtXG4gKiBjb3JyZXNwb25kcyB0by5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAYXVnbWVudHMgQmFja2JvbmUuTW9kZWxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG4gIHR5cGU6ICdTY2hlbWEnLFxuXG4gIC8qKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKlxuICAgKiBAcHJvcCBtYXJrdXBcbiAgICovXG4gIGRlZmF1bHRzOiB7XG5cbiAgICAnYWxsb3dlZCc6IHt9LFxuICB9LFxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIGEgdHlwZSBpcyBhbGxvd2VkIHdpdGhpbiBhIHNjaGVtYS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogICBUaGUgdHlwZSB0byB0ZXN0IHZhbGlkaXR5IGZvci5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbH1cbiAgICogICBUcnVlIGlmIHRoZSB0eXBlIGlzIGFsbG93ZWQgd2l0aGluIHRoZSBzY2hlbWEgbm9kZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgaXNBbGxvd2VkOiBmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuICEhdGhpcy5nZXQoJ2FsbG93ZWQnKVt0eXBlXTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIG1vZGVsIGZvciByZXByZXNlbnRpbmcgZWRpdG9yIHdpZGdldHMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG52YXIgU3RhdGUgPSB7XG4gIFJFQURZOiAweDAxLFxuICBERVNUUk9ZRURfV0lER0VUOiAweDAyLFxuICBERVNUUk9ZRURfUkVGUzogMHgwNCxcbiAgREVTVFJPWUVEOiAweDA2LFxufTtcblxuLyoqXG4gKiBCYWNrYm9uZSAgTW9kZWwgZm9yIHJlcHJlc2VudGluZyBlZGl0b3Igd2lkZ2V0cy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAYXVnbWVudHMgQmFja2JvbmUuTW9kZWxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG4gIHR5cGU6ICdXaWRnZXQnLFxuXG4gIC8qKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKlxuICAgKiBAcHJvcCBtYXJrdXBcbiAgICovXG4gIGRlZmF1bHRzOiB7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgY29udGV4dCB0aGUgd2lkZ2V0IGlzIGluLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBjb250ZXh0SWQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdG8gYmUgc2VudCB3aXRoIHRoZSBjb21tYW5kLlxuICAgICAqXG4gICAgICogQHR5cGUge2ludH1cbiAgICAgKi9cbiAgICBpdGVtSWQ6IDAsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0byBiZSBzZW50IHdpdGggdGhlIGNvbW1hbmQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7aW50fVxuICAgICAqL1xuICAgIGl0ZW1Db250ZXh0SWQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGludGVybmFsIG1hcmt1cCB0byBkaXNwbGF5IGluIHRoZSB3aWRnZXQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1hcmt1cDogJycsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0byBiZSBzZW50IHdpdGggdGhlIGNvbW1hbmQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGVkaXRzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgb3Igbm90IHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0gaXMgYmVpbmcgZHVwbGljYXRlZC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtib29sfVxuICAgICAqL1xuICAgIGR1cGxpY2F0aW5nOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkZXN0cnVjdGlvbiBzdGF0ZSBmb3IgdGhlIHdpZGdldC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtpbnR9XG4gICAgICovXG4gICAgc3RhdGU6IFN0YXRlLlJFQURZLFxuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgdGhpcy53aWRnZXQgPSBvcHRpb25zLndpZGdldDtcbiAgICB0aGlzLl9lZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkgPSBvcHRpb25zLmVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeTtcbiAgICB0aGlzLl9jb250ZXh0UmVzb2x2ZXIgPSBvcHRpb25zLmNvbnRleHRSZXNvbHZlcjtcbiAgICBCYWNrYm9uZS5Nb2RlbC5hcHBseSh0aGlzLCBbYXR0cmlidXRlcywgb3B0aW9uc10pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgc2V0OiBmdW5jdGlvbihhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgdGhpcy5fZmlsdGVyQXR0cmlidXRlcyhhdHRyaWJ1dGVzKTtcbiAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsIGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBhIHJlcXVlc3QgdG8gZWRpdCB0aGUgcmVmZXJlbmNlZCBlZGl0IGJ1ZmZlciBpdGVtLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIGVkaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYuZWRpdCh0aGlzLmdldCgnZWRpdHMnKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIGEgcmVxdWVzdCB0byBkdXBsaWNhdGUgdGhlIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbS5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBkdXBsaWNhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0KHsgZHVwbGljYXRpbmc6IHRydWUgfSk7XG4gICAgdGhpcy5lZGl0QnVmZmVySXRlbVJlZi5kdXBsaWNhdGUodGhpcy5nZXQoJ2lkJyksIHRoaXMuZ2V0KCdlZGl0cycpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAvLyBJZiB0aGUgd2lkZ2V0IGhhcyBub3QgYWxyZWFkeSBiZWVuIG1hcmtlZCBhcyBkZXN0cm95ZWQgd2UgdHJpZ2dlciBhXG4gICAgLy8gZGVzdHJveSBldmVudCBvbiB0aGUgd2lkZ2V0IGNvbGxlY3Rpb24gc28gaXQgY2FuIGluc3RydWN0IGFueXRoaW5nIHRoYXRcbiAgICAvLyByZWZlcmVuY2VzIHRoaXMgd2lkZ2V0IHRvIGNsZWFuIGl0IG91dC4gUmVkdW5kYW50IGRlc3Ryb3kgY2FsbHMgYXJlXG4gICAgLy8gaWdub3JlZC5cbiAgICBpZiAoIXRoaXMuaGFzU3RhdGUoU3RhdGUuREVTVFJPWUVEKSkge1xuICAgICAgdGhpcy50cmlnZ2VyKCdkZXN0cm95JywgdGhpcywgdGhpcy5jb2xsZWN0aW9uLCBvcHRpb25zKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoU3RhdGUuREVTVFJPWUVEKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIGRlc3RydWN0aW9uIHN0YXRlIGZvciB0aGlzIHdpZGdldC5cbiAgICpcbiAgICogQHBhcmFtIHtXaWRnZXRNb2RlbC5TdGF0ZX0gc3RhdGVcbiAgICogICBUaGUgc3RhdGUgdG8gc2V0IG9uIHRoZSB3aWRnZXQgbW9kZWwuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgc2V0U3RhdGU6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgcmV0dXJuIHRoaXMuc2V0KHtzdGF0ZTogdGhpcy5nZXQoJ3N0YXRlJykgfCBzdGF0ZX0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGRlc3RydWN0aW9uIHN0YXRlIGZvciB0aGlzIHdpZGdldC5cbiAgICpcbiAgICogQHBhcmFtIHtXaWRnZXRNb2RlbC5TdGF0ZX0gc3RhdGVcbiAgICogICBUaGUgc3RhdGUgdG8gY2hlY2sgZm9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtib29sfVxuICAgKiAgIFRydWUgb2YgdGhlIG1vZGVsIGhhcyB0aGUgcHJvdmlkZWQgc3RhdGUgc2V0LCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBoYXNTdGF0ZTogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICByZXR1cm4gKHRoaXMuZ2V0KCdzdGF0ZScpICYgc3RhdGUpID09PSBzdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICogQXBwbGllcyBhdHRyaWJ1dGUgZmlsdGVyaW5nIGZvciAnc2V0JyBtZXRob2QgY2FsbHMuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhdHRyaWJ1dGVzXG4gICAqICAgVGhlIGF0dHJpYnV0ZXMgdGhhdCBuZWVkIHRvIGJlIGZpbHRlcmVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX2ZpbHRlckF0dHJpYnV0ZXM6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgICAvLyBSdW4gdGhlIGNoYW5nZSBoYW5kbGVyIHRvIHJlYnVpbGQgYW55IHJlZmVyZW5jZXMgdG8gZXh0ZXJuYWwgbW9kZWxzXG4gICAgLy8gaWYgbmVjZXNzYXJ5LiBXZSBkbyB0aGlzIGhlcmUgaW5zdGVhZCBvZiBvbignY2hhbmdlJykgdG8gZW5zdXJlIHRoYXRcbiAgICAvLyBzdWJzY3JpYmVkIGV4dGVybmFsIGxpc3RlbmVycyBnZXQgY29uc2lzdGVudCBhdG9taWMgY2hhbmdlXG4gICAgLy8gbm90aWZpY2F0aW9ucy5cbiAgICBpZiAodGhpcy5fcmVmcmVzaEVkaXRCdWZmZXJJdGVtUmVmKGF0dHJpYnV0ZXMpIHx8IGF0dHJpYnV0ZXMuZWRpdHMpIHtcbiAgICAgIHRoaXMuX3NldHVwTGlzdGVuZXJzKGF0dHJpYnV0ZXMpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSW50ZXJuYWwgZnVuY3Rpb24gdG8gaGFuZGxlIGNoYW5nZXMgdG8gdGhlIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbS5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGF0dHJpYnV0ZXNcbiAgICogICBBbiBhdHRyaWJ1dGVzIG9iamVjdCB0byBwYXJzZSBmb3IgY2hhbmdlcyB0aGF0IGNvdWxkIGhhdmUgc2lkZS1lZmZlY3RzLlxuICAgKlxuICAgKiBAcmV0dXJuIHtib29sfVxuICAgKiAgIFRydWUgaWYgdGhlIGNoYW5nZXMgaW4gdGhlIGF0dHJpYnV0ZXMgb2JqZWN0IHNpZ25hbGVkIHRoYXQgdGhpcyBtb2RlbFxuICAgKiAgIG5lZWRzIHRvIHN0YXJ0IGxpc3RlbmluZyB0byBuZXcgb2JqZWN0cywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgX3JlZnJlc2hFZGl0QnVmZmVySXRlbVJlZjogZnVuY3Rpb24oYXR0cmlidXRlcykge1xuICAgIC8vIFRyYWNrIHdoZXRoZXIgd2UgbmVlZCB0byB1cGRhdGUgd2hpY2ggcmVmZXJlbmNlZCBtb2RlbHMgd2UgYXJlXG4gICAgLy8gbGlzdGVuaW5nIHRvLlxuICAgIHZhciBzZXR1cExpc3RlbmVycyA9IGZhbHNlO1xuXG4gICAgLy8gR2V0IHRoZSBjb25zb2xpZGF0ZWQgbGlzdCBvZiBvbGQgLyB1cGRhdGVkIHByb3BlcnRpZXMgdG8gY2hlY2sgZm9yXG4gICAgLy8gY2hhbmdlcy5cbiAgICB2YXIgb2xkSXRlbUNvbnRleHQgPSB0aGlzLmdldCgnaXRlbUNvbnRleHRJZCcpO1xuICAgIHZhciBvbGRXaWRnZXRDb250ZXh0ID0gdGhpcy5nZXQoJ2NvbnRleHRJZCcpO1xuICAgIHZhciBvbGRJdGVtSWQgPSB0aGlzLmdldCgnaXRlbUlkJyk7XG4gICAgdmFyIG5ld0l0ZW1Db250ZXh0ID0gYXR0cmlidXRlcy5pdGVtQ29udGV4dElkID8gYXR0cmlidXRlcy5pdGVtQ29udGV4dElkIDogb2xkSXRlbUNvbnRleHQ7XG4gICAgdmFyIG5ld1dpZGdldENvbnRleHQgPSBhdHRyaWJ1dGVzLmNvbnRleHRJZCA/IGF0dHJpYnV0ZXMuY29udGV4dElkIDogb2xkV2lkZ2V0Q29udGV4dDtcbiAgICB2YXIgbmV3SXRlbUlkID0gYXR0cmlidXRlcy5pdGVtSWQgPyBhdHRyaWJ1dGVzLml0ZW1JZCA6IG9sZEl0ZW1JZDtcblxuICAgIC8vIElmIHRoZSBjb250ZXh0IHRoZSBidWZmZXIgaXRlbSBoYXMgY2hhbmdlZCwgdGhlIGNvbnRleHQgb2YgdGhlIHdpZGdldFxuICAgIC8vIGhhcyBjaGFuZ2VkLCBvciB0aGUgcmVmZXJlbmNlZCBlZGl0IGJ1ZmZlciBpdGVtIGlkIGhhcyBjaGFuZ2VkIHdlIG5lZWRcbiAgICAvLyB0byByZWdlbmVyYXRlIHRoZSBlZGl0IGJ1ZmZlciBpdGVtIHJlZmVyZW5jZSBhbmQgaW5zdHJ1Y3QgdGhlIGNhbGxlciB0b1xuICAgIC8vIHVwZGF0ZSB0aGUgbW9kZWxzIHRoaXMgd2lkZ2V0IGlzIGxpc3RlbmluZyB0by5cbiAgICBpZiAobmV3SXRlbUNvbnRleHQgIT0gb2xkSXRlbUNvbnRleHQgfHwgbmV3V2lkZ2V0Q29udGV4dCAhPSBvbGRXaWRnZXRDb250ZXh0IHx8IG5ld0l0ZW1JZCAhPSBvbGRJdGVtSWQpIHtcbiAgICAgIHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYgPSB0aGlzLl9lZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkuY3JlYXRlRnJvbUlkcyhuZXdJdGVtSWQsIG5ld0l0ZW1Db250ZXh0LCBuZXdXaWRnZXRDb250ZXh0KTtcbiAgICAgIHNldHVwTGlzdGVuZXJzID0gdHJ1ZTtcbiAgICAgIGF0dHJpYnV0ZXMubWFya3VwID0gdGhpcy5lZGl0QnVmZmVySXRlbVJlZi5lZGl0QnVmZmVySXRlbS5nZXQoJ21hcmt1cCcpO1xuICAgIH1cblxuICAgIHJldHVybiBzZXR1cExpc3RlbmVycztcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyBhbnkgc3RhbGUgbGlzdGVuZXJzIGFuZCBzZXRzIHVwIGZyZXNoIGxpc3RlbmVycy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGF0dHJpYnV0ZXNcbiAgICogICBBbiBhdHRyaWJ1dGVzIG9iamVjdCB0byB1c2UgdG8gZGV0ZXJtaW5lIHdoaWNoIHJlbGF0ZWQgbW9kZWxzIG5lZWQgdG8gYmVcbiAgICogICBsaXN0ZW5lZCB0by5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBfc2V0dXBMaXN0ZW5lcnM6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKVxuICAgICAgLmxpc3RlblRvKHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYuZWRpdEJ1ZmZlckl0ZW0sICdjaGFuZ2U6bWFya3VwJywgdGhpcy5fcmVhZEZyb21CdWZmZXJJdGVtKVxuICAgICAgLmxpc3RlblRvKHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYuc291cmNlQ29udGV4dCwgJ2NoYW5nZTppZCcsIHRoaXMuX3VwZGF0ZUNvbnRleHQpXG4gICAgICAubGlzdGVuVG8odGhpcy5lZGl0QnVmZmVySXRlbVJlZi50YXJnZXRDb250ZXh0LCAnY2hhbmdlOmlkJywgdGhpcy5fdXBkYXRlQ29udGV4dCk7XG5cbiAgICBfLmVhY2goYXR0cmlidXRlcy5lZGl0cywgZnVuY3Rpb24odmFsdWUsIGNvbnRleHRTdHJpbmcpIHtcbiAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldChjb250ZXh0U3RyaW5nKTtcbiAgICAgIHRoaXMubGlzdGVuVG8oY29udGV4dCwgJ2NoYW5nZTppZCcsIHRoaXMuX3VwZGF0ZUNvbnRleHQpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsIGZ1bmN0aW9uIHRvIGNvcHkgdXBkYXRlcyBmcm9tIHRoZSByZWZlcmVuY2VkIGJ1ZmZlciBpdGVtLlxuICAgKlxuICAgKiBAcGFyYW0ge0JhY2tib25lLk1vZGVsfSBidWZmZXJJdGVtTW9kZWxcbiAgICogICBUaGUgYnVmZmVyIGl0ZW0gbW9kZWwgdG8gY29weSBtYXJrdXAgY2hhbmdlcyBmcm9tLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX3JlYWRGcm9tQnVmZmVySXRlbTogZnVuY3Rpb24oYnVmZmVySXRlbU1vZGVsKSB7XG4gICAgdGhpcy5zZXQoe21hcmt1cDogYnVmZmVySXRlbU1vZGVsLmdldCgnbWFya3VwJyl9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW50ZXJuYWwgZnVuY3Rpb24gdG8gaGFuZGxlIHdoZW4gYSByZWZlcmVuY2VkIGNvbnRleHQgaWQgaGFzIGNoYW5nZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7QmFja2JvbmUuTW9kZWx9IGNvbnRleHRNb2RlbFxuICAgKiAgIFRoZSBjb250ZXh0IG1vZGVsIHRoYXQgaGFzIGhhZCBhbiBpZCBhdHRyaWJ1dGUgY2hhbmdlZC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIF91cGRhdGVDb250ZXh0OiBmdW5jdGlvbihjb250ZXh0TW9kZWwpIHtcbiAgICB2YXIgb2xkSWQgPSBjb250ZXh0TW9kZWwucHJldmlvdXMoJ2lkJyk7XG4gICAgdmFyIG5ld0lkID0gY29udGV4dE1vZGVsLmdldCgnaWQnKTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuXG4gICAgLy8gVXBkYXRlIGFueSBjb250ZXh0IGlkIHJlZmVyZW5jZXMgdGhhdCBtYXkgbmVlZCB0byBjaGFuZ2UuXG4gICAgaWYgKHRoaXMuZ2V0KCdpdGVtQ29udGV4dElkJykgPT0gb2xkSWQpIHtcbiAgICAgIGF0dHJpYnV0ZXMuaXRlbUNvbnRleHRJZCA9IG5ld0lkO1xuICAgIH1cbiAgICBpZiAodGhpcy5nZXQoJ2NvbnRleHRJZCcpID09IG9sZElkKSB7XG4gICAgICBhdHRyaWJ1dGVzLmNvbnRleHRJZCA9IG5ld0lkO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBjb250ZXh0IHdhcyByZWZlcmVuY2VkIGJ5IGFuIGVkaXQgb24gdGhlIG1vZGVsLCB1cGRhdGUgdGhlIGVkaXQuXG4gICAgdmFyIGVkaXRzID0gdGhpcy5nZXQoJ2VkaXRzJyk7XG4gICAgaWYgKGVkaXRzW29sZElkXSkge1xuICAgICAgYXR0cmlidXRlcy5lZGl0cyA9IHt9O1xuICAgICAgXy5lYWNoKGVkaXRzLCBmdW5jdGlvbih2YWx1ZSwgY29udGV4dFN0cmluZykge1xuICAgICAgICBpZiAoY29udGV4dFN0cmluZyA9PSBvbGRJZCkge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZWRpdHNbbmV3SWRdID0gdmFsdWUucmVwbGFjZShvbGRJZCwgbmV3SWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZWRpdHNbY29udGV4dFN0cmluZ10gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy5zZXQoYXR0cmlidXRlcyk7XG4gICAgdGhpcy50cmlnZ2VyKCdyZWJhc2UnLCB0aGlzLCBvbGRJZCwgbmV3SWQpO1xuICB9LFxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMuU3RhdGUgPSBTdGF0ZTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIHRoZSBsb2dpYyBmb3IgZXhlY3V0aW5nIGNvbW1hbmRzIGZyb20gdGhlIHF1ZXVlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgdW5pbXBsZW1lbnRlZCA9IHJlcXVpcmUoJy4uL3VuaW1wbGVtZW50ZWQnKTtcblxuLyoqXG4gKiBBIGJhc2UgZm9yIGVkaXRvciBhZGFwdGVyIHBsdWdpbnMuXG4gKlxuICogQWRhcHRlciBwbHVnaW5zIGFyZSB0aGUgZ2x1ZSB0aGF0IHRyYW5zbGF0ZXMgZGF0YSBtdXRhdGlvbnMgd2l0aGluIHRoZVxuICogd2lkZ2V0IGJpbmRlciBsaWJyYXJ5IGludG8gYSBzcGVjaWZpYyBlZGl0b3IncyBBUEkgY2FsbHMuIEFzIGxvbmcgYXMgYW5cbiAqIGVkaXRvciB1c2VzIHRoZSBET00gYXMgdGhlIHByaW1hcnkgbWV0aG9kIG9mIHN0b3JhZ2UsIHRoZSB3aWRnZXQgYmluZGVyXG4gKiBsaWJyYXJ5IGNhbiBoYW5kbGUgbW9zdCBvZiB0aGUgbXV0YXRpb25zIHdpdGhvdXQgZWRpdG9yIHNwZWNpZmljIGNvZGUuIEVhY2hcbiAqIGVkaXRvciBtYXkgaGF2ZSBpdHMgb3duIGZsYXZvciBvZiBET00gd3JhcHBlcnMgYW5kIGlubGluZSBlZGl0aW5nIGhhbmRsaW5nLFxuICogc28gdGhpcyBwbHVnaW4gaXMgcmVxdWlyZWQgdG8gYnJpZGdlIHRoZSBnYXAgYmV0d2VlbiB0aGUgZWRpdG9yJ3MgQVBJIGFuZFxuICogdGhlIGRhdGEgb3BlcmF0aW9ucy5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwgQmFja2JvbmUuRXZlbnRzLCB7XG5cbiAgLyoqXG4gICAqIEluc2VydHMgYW4gZW1iZWQgY29kZSBpbnRvIHRoZSBlZGl0b3IuXG4gICAqXG4gICAqIFRoaXMgc2hvdWxkIGluc2VydCB0aGUgbmV3bHkgY3JlYXRlZCBlbGVtZW50IGF0IHRoZSBjdXJyZW50IGVkaXRhYmxlIGN1cnNvclxuICAgKiBwb3NpdGlvbiB3aXRoaW4gdGhlIGVkaXRvci5cbiAgICpcbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbWJlZENvZGVcbiAgICogICBUaGUgZW1iZWQgY29kZSBlbGVtZW50IHRvIGJlIGluc2VydGVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgaW5zZXJ0RW1iZWRDb2RlOiBmdW5jdGlvbihlbWJlZENvZGUpIHtcbiAgICB1bmltcGxlbWVudGVkKGVtYmVkQ29kZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSB3aWRnZXQgZnJvbSB0aGUgZWRpdG9yLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCByZW1vdmUgdGhlIHdpZGdldCBiYXNlZCBvbiBpdHMgdW5pcXVlIGlkIGFuZCBmcmVlIGFueVxuICAgKiBhc3NvY2lhdGVkIG1lbW9yeS5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdG8gYmUgZGVzdHJveWVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZGVzdHJveVdpZGdldDogZnVuY3Rpb24oaWQpIHtcbiAgICB1bmltcGxlbWVudGVkKGlkKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0cyB1cCBhbiBpbmxpbmUgZWRpdGFibGUgZmllbGQgd2l0aGluIGEgd2lkZ2V0LlxuICAgKlxuICAgKiBUaGUgd2lkZ2V0VmlldyBwYXJhbWV0ZXIgZ2l2ZXMgdGhlIGFkYXB0ZXIgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCB0aGF0XG4gICAqIHNob3VsZCBiZSBpbmxpbmUtZWRpdGFibGUuIFRoZSBjb250ZXh0SWQgYWxsb3dzIGFjY2VzcyB0byB0aGUgY3VycmVudFxuICAgKiBpbmxpbmUgZWRpdHMgZm9yIHRoZSBwYXJ0aWN1bGFyIGNvbnRleHQsIGFuZCB0aGUgc2VsZWN0b3IgaXMgYSBqUXVlcnkgc3R5bGVcbiAgICogc2VsZWN0b3IgZGljdGF0aW5nIHdoaWNoIG5vZGUgaW4gdGhlIHdpZGdldFZpZXcgRE9NIHdpbGwgYmVjb21lXG4gICAqIGlubGluZS1lZGl0YWJsZS5cbiAgICpcbiAgICogQHBhcmFtIHtCYWNrYm9uZS5WaWV3fSB3aWRnZXRWaWV3XG4gICAqICAgVGhlIHZpZXcgZm9yIHRoZSB3aWRnZXQgdGhhdCBjb250YWlucyB0aGUgZmllbGQgdGhhdCB3aWxsIGJlY29tZVxuICAgKiAgIGVkaXRhYmxlLlxuICAgKiBAcGFyYW0ge21peGVkfSBjb250ZXh0SWRcbiAgICogICBUaGUgY29udGV4dCBpZCB0byBvZiB0aGUgZmllbGQgdGhhdCBzaG91bGQgYmVjb21lIGlubGluZSBlZGl0YWJsZS4gRWFjaFxuICAgKiAgIGVkaXRhYmxlIGZpZWxkIGRlZmluZXMgYSB1bmlxdWUgY29udGV4dCBmb3IgaXRzIGNoaWxkcmVuLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3JcbiAgICogICBBIGpRdWVyeSBzdHlsZSBzZWxlY3RvciBmb3Igc3BlY2lmeWluZyB3aGljaCBlbGVtZW50IHdpdGhpbiB0aGUgd2lkZ2V0XG4gICAqICAgc2hvdWxkIGJlY29tZSBlZGl0YWJsZS4gVGhlIHNlbGVjdG9yIGlzIHJlbGF0aXZlIHRvIHRoZSB2aWV3J3Mgcm9vdCBlbFxuICAgKiAgIHByb3BlcnR5LlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgYXR0YWNoSW5saW5lRWRpdGluZzogZnVuY3Rpb24od2lkZ2V0VmlldywgY29udGV4dElkLCBzZWxlY3Rvcikge1xuICAgIHVuaW1wbGVtZW50ZWQod2lkZ2V0VmlldywgY29udGV4dElkLCBzZWxlY3Rvcik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlYWRzIHRoZSBpbmxpbmUgZWRpdCBmb3IgYW4gZWRpdGFibGUgd2lkZ2V0IGZpZWxkIGZyb20gdGhlIHdpZGdldCdzIERPTS5cbiAgICpcbiAgICogQHBhcmFtIHtCYWNrYm9uZS5WaWV3fSB3aWRnZXRWaWV3XG4gICAqICAgVGhlIHZpZXcgZm9yIHRoZSB3aWRnZXQgdGhhdCBjb250YWlucyB0aGUgZmllbGQgdG8gcmVhZCBpbmxpbmUgZWRpdHNcbiAgICogICBmcm9tLlxuICAgKiBAcGFyYW0ge21peGVkfSBjb250ZXh0SWRcbiAgICogICBUaGUgY29udGV4dCBpZCB0byByZWFkIHRoZSBpbmxpbmUgZWRpdCBmcm9tLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3JcbiAgICogICBBIGpRdWVyeSBzdHlsZSBzZWxlY3RvciBmb3Igc3BlY2lmeWluZyB3aGljaCBlbGVtZW50IHdpdGhpbiB0aGUgd2lkZ2V0XG4gICAqICAgc2hvdWxkIHRoZSBpbmxpbmUgZWRpdHMgc2hvdWxkIGJlIHJlYWQgZnJvbS4gVGhlIHNlbGVjdG9yIGlzIHJlbGF0aXZlIHRvXG4gICAqICAgdGhlIHZpZXcncyByb290IGVsIHByb3BlcnR5LlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqICAgVGhlIHByb2Nlc3NlZCBpbmxpbmUgZWRpdCBtYXJrdXAgZm9yIHRoZSBzcGVjaWZpZWQgY29udGV4dElkLlxuICAgKi9cbiAgZ2V0SW5saW5lRWRpdDogZnVuY3Rpb24od2lkZ2V0VmlldywgY29udGV4dElkLCBzZWxlY3Rvcikge1xuICAgIHJldHVybiB1bmltcGxlbWVudGVkKHdpZGdldFZpZXcsIGNvbnRleHRJZCwgc2VsZWN0b3IpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSByb290IERPTSBlbGVtZW50IGZvciB0aGUgZWRpdG9yLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCB0ZWxscyB0aGUgZWRpdG9yIGhvdyB0byBcbiAgICpcbiAgICogQHJldHVybiB7RE9NRWxlbWVudH1cbiAgICogICBUaGUgcm9vdCBET00gZWxlbWVudCBmb3IgdGhlIGVkaXRvci5cbiAgICovXG4gIGdldFJvb3RFbDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHVuaW1wbGVtZW50ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogQW4gb3B0aW9uYWwgbWV0aG9kIGZvciBwZXJmb3JtaW5nIGFueSBjbGVhbnVwIGFmdGVyIHRyYWNrZXIgZGVzdHJ1Y3Rpb24uXG4gICAqXG4gICAqIFRoaXMgd2lsbCBiZSBjYWxsZWQgd2hlbiB0aGUgd2lkZ2V0IHRyYWNrZXIgaGFzIGJlZW4gZGVzdHJveWVkLiBJdCBpc1xuICAgKiB1c3VhbGx5IG5vdCBuZWNlc3NhcnkgdG8gaW1wbGVtZW50IHRoaXMgbWV0aG9kLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgY2xlYW51cDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzLmV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZDtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGFuIGludGVyZmFjZSBmb3IgcHJvdG9jb2wgcGx1Z2lucy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIHVuaW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91bmltcGxlbWVudGVkJyk7XG5cbi8qKlxuICogQSBiYXNlIGZvciBwcm90b2NvbCBwbHVnaW5zLlxuICpcbiAqIFByb3RvY29sIHBsdWdpbnMgaGFuZGxlIHRoZSByZXF1ZXN0IC8gcmVzcG9uc2UgbWVjaGFuaXNtIGZvciBzeW5jaW5nIGRhdGEgdG9cbiAqIGFuZCBmcm9tIHRoZSBzZXJ2ZXIuIFRoZXkgcHJvdmlkZSBhIHNpbmdsZSBtZXRob2QgJ3NlbmQnIHRoYXQgd2lsbCBiZSBjYWxsZWRcbiAqIHdoZW4gcmVxdWVzdHMgYXJlIGRpc3BhdGNoZWQuXG4gKlxuICogVGhlIGNvbW1hbmQgcmVzb2x2ZXIgaXMgdXNlZCB0byBwYXNzIHRoZSByZXNwb25zZSBiYWNrIGludG8gdGhlIHRyYWNraW5nXG4gKiBzeXN0ZW0gYXN5bmNocm9ub3VzbHkuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogU2VuZHMgYSByZXF1ZXN0IHRvIHRoZSBkYXRhIHN0b3JlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgaW5pdGlhdGUgYSByZXF1ZXN0LCB0aGVuIGNhbGwgcmVzb2x2ZXIucmVzb2x2ZShkYXRhKVxuICAgKiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICogXG4gICAqIFRoZSBkYXRhIG9iamVjdCBwYXNzZWQgdG8gcmVzb2x2ZSgpIG1heSBjb250YWluIG9uZSBvciBtb3JlIG9mOiAnY29udGV4dCcsXG4gICAqICd3aWRnZXQnLCAnZWRpdEJ1ZmZlckl0ZW0nLCAnc2NoZW1hJy4gRWFjaCBlbnRyeSBzaG91bGQgYmUgYSBkYXRhIG1vZGVsXG4gICAqIGtleWVkIGJ5IHRoZSBpZCBvZiB0aGUgZGF0YSBtb2RlbC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogICBUaGUgcmVxdWVzdCB0eXBlLiBUaGlzIGNhbiBiZSBvbmUgb2Y6ICdJTlNFUlRfSVRFTScsICdSRU5ERVJfSVRFTScsXG4gICAqICAgJ0RVUExJQ0FURV9JVEVNJywgJ0ZFVENIX1NDSEVNQScuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhXG4gICAqICAgVGhlIGRhdGEgdG8gYmUgc2VudCBpbiB0aGUgcmVxdWVzdC5cbiAgICogQHBhcmFtIHtTeW5jQWN0aW9uUmVzb2x2ZXJ9IHJlc29sdmVyXG4gICAqICAgVGhlIHJlc29sdmVyIHNlcnZpY2UgdGhhdCB3aWxsIGJlIHVzZWQgdG8gcmVzb2x2ZSB0aGUgY29tbWFuZC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIHNlbmQ6IGZ1bmN0aW9uKHR5cGUsIGRhdGEsIHJlc29sdmVyKSB7XG4gICAgdW5pbXBsZW1lbnRlZCh0eXBlLCBkYXRhLCByZXNvbHZlcik7XG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzLmV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZDtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBBIGNlbnRyYWwgZGlzcGF0Y2hlciBmb3Igc2VuZGluZyBjb21tYW5kcyB0byB0aGUgY2Fub25pY2FsIGRhdGEgc3RvcmUuXG4gKlxuICogRGVmYXVsdCBTdXBwb3J0ZWQgQWN0aW9uczpcbiAqXG4gKiAgIElOU0VSVF9JVEVNOiBSZXF1ZXN0cyBhIG5ldyBlZGl0IGJ1ZmZlciBpdGVtIGZyb20gdGhlIGRhdGEgc3RvcmUuIFRoaXNcbiAqICAgdHJpZ2dlcnMgdGhlIGNyZWF0aW9uIG9mIGFuIGVkaXQgYnVmZmVyIGl0ZW0gb24gdGhlIHNlcnZlciwgYW5kIHNob3VsZFxuICogICByZXNvbHZlIHdpdGggdGhlIG5ldyBpdGVtLlxuICpcbiAqICAgRURJVF9JVEVNOiBSZXF1ZXN0cyB0aGF0IGFuIGV4aXN0aW5nIGVkaXQgYnVmZmVyIGl0ZW0gYmUgZWRpdGVkLiBUaGlzXG4gKiAgIHRyaWdnZXJzIGFuIGVkaXQgZmxvdyBvbiB0aGUgc2VydmVyLiBUaGUgYWN0dWFsIGRldGFpbHMgb2YgdGhhdCBmbG93IGFyZVxuICogICBub3QgZW5mb3JjZWQuIEZvciBleGFtcGxlLCB0aGUgc2VydmVyIG1heSBkZWxpdmVyIGJhY2sgYW4gYWpheCBmb3JtIGZvciB0aGVcbiAqICAgZWRpdCBidWZmZXIgaXRlbSBhbmQgcmVzb2x2ZSB0aGUgYWN0aW9uIG9uY2UgdGhhdCBmb3JtIGlzIHN1Ym1pdHRlZC4gVGhlXG4gKiAgIHJlc29sdXRpb24gc2hvdWxkIGluY2x1ZGUgdGhlIHVwZGF0ZXMgbWFkZSB0byB0aGUgZWRpdCBidWZmZXIgaXRlbSBtb2RlbC5cbiAqXG4gKiAgIFJFTkRFUl9JVEVNOiBSZXF1ZXN0cyB0aGUgcmVwcmVzZW50YXRpb25hbCBtYXJrdXAgZm9yIGEgZGF0YSBlbnRpdHkgdGhhdFxuICogICB3aWxsIGJlIHJlbmRlcmVkIGluIHRoZSBlZGl0b3Igdmlld21vZGUuIFRoZSBjb21tYW5kIHNob3VsZCByZXNvbHZlIHdpdGhcbiAqICAgdGhlIGVkaXQgYnVmZmVyIGl0ZW0gbW9kZWwgY29udGFpbmluZyB0aGUgdXBkYXRlZCBtYXJrdXAuIFRoaXMgbWFya3VwIHdpbGxcbiAqICAgYXV0b21hdGljYWxseSBiZSBzeW5jZWQgdG8gdGhlIHdpZGdldC4gVGhlIG1hcmt1cCBjYW4gYWxzbyBjb250YWluIGlubGluZVxuICogICBlZGl0YWJsZSBmaWVsZHMgaW4gdGhlIGZvcm1hdCBzcGVjaWZpZWQgYnkgdGhlIHN5bmMgY29uZmlndXJhdGlvbi5cbiAqXG4gKiAgIERVUExJQ0FURV9JVEVNOiBSZXF1ZXN0cyB0aGF0IGFuIGl0ZW0gYmUgZHVwbGljYXRlZCBpbiB0aGUgc3RvcmUsIHJlc3VsdGluZ1xuICogICBpbiBhIG5ld2x5IGNyZWF0ZWQgaXRlbS4gVGhpcyBjb21tYW5kIHNob3VsZCByZXNvbHZlIHdpdGggdGhlIG5ld2x5IGNyZWF0ZWRcbiAqICAgZWRpdCBidWZmZXIgbW9kZWwuXG4gKlxuICogICBGRVRDSF9TQ0hFTUE6IFJlcXVlc3RzIHRoZSBzY2hlbWEgZm9yIGEgZmllbGQgZnJvbSB0aGUgc2VydmVyLiBUaGlzIHNob3VsZFxuICogICByZXNvbHZlIHdpdGggYSBzY2hlbWEgbW9kZWwgZGV0YWlsaW5nIHdoaWNoIG90aGVyIHR5cGVzIG9mIGZpZWxkcyBjYW4gYmVcbiAqICAgbmVzdGVkIGluc2lkZSB0aGUgZ2l2ZW4gZmllbGQgdHlwZS5cbiAqXG4gKiBAcGFyYW0ge1N5bmNQcm90b2NvbH0gcHJvdG9jb2xcbiAqICAgQSBwcm90b2NvbCBwbHVnaW4gZm9yIGhhbmRsaW5nIHRoZSByZXF1ZXN0IC8gcmVzcG9uc2UgdHJhbnNhY3Rpb24uXG4gKiBAcGFyYW0ge1N5bmNBY3Rpb25SZXNvbHZlcn0gcmVzb2x2ZXJcbiAqICAgVGhlIHJlc29sdmVyIHNlcnZpY2UgZm9yIHByb2Nlc3Npbmcgc3luYyBhY3Rpb24gcmVzcG9uc2VzLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHByb3RvY29sLCByZXNvbHZlcikge1xuICB0aGlzLl9wcm90b2NvbCA9IHByb3RvY29sO1xuICB0aGlzLl9yZXNvbHZlciA9IHJlc29sdmVyO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoZXMgYSBzeW5jIGFjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogICBTaG91bGQgYmUgb25lIG9mOiAnSU5TRVJUX0lURU0nLCAnRURJVF9JVEVNJywgJ1JFTkRFUl9JVEVNJyxcbiAgICogICAnRFVQTElDQVRFX0lURU0nLCAnRkVUQ0hfU0NIRU1BJy5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGFcbiAgICogICBBcmJpdHJhcnkgZGF0YSByZXByZXNlbnRpbmcgdGhlIHJlcXVlc3QuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBkaXNwYXRjaDogZnVuY3Rpb24odHlwZSwgZGF0YSkge1xuICAgIHRoaXMuX3Byb3RvY29sLnNlbmQodHlwZSwgZGF0YSwgdGhpcy5fcmVzb2x2ZXIpO1xuICB9XG5cbn0pO1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqIEEgY2xhc3MgZm9yIHJlc29sdmluZyBkaXNwYXRjaGVkIGFjdGlvbnMuXG4gKlxuICogRGlzcGF0Y2hlZCBhY3Rpb25zIGFyZSByZXNvbHZlZCBieSBjaGVja2luZyB0aGUgcmVzcG9uc2UgZm9yIG1vZGVscyB0aGF0XG4gKiBzaG91bGQgYmUgYWRkZWQgdG8gdGhlIGFwcHJvcHJpYXRlIGNvbGxlY3Rpb24uXG4gKlxuICogVGhlIHJlc29sdmVyIHNlcnZpY2UgaXMgc2V0IHVwIHdpdGggYSBtYXBwaW5ncyBvZiBtb2RlbHMtdG8tY29sbGVjdGlvbnMgYW5kXG4gKiB1c2VzIHRoaXMgbWFwcGluZyB0byB1cGRhdGUgdGhlIGFzc29jaWF0ZWQgY29sbGVjdGlvbiB3aGVuIGl0IHNlZXMgYSBtb2RlbFxuICogdGhhdCBoYXMgYmVlbiBtYXBwZWQuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2NvbGxlY3Rpb25zID0ge307XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogQWRkcyBhIG1vZGVsLXRvLWNvbGxlY3Rpb24gbWFwLlxuICAgKlxuICAgKiBUaGlzIG1hcCBpcyB1c2VkIHRvIGFkZCBtb2RlbHMgaW4gdGhlIHJlc3BvbnNlIHRvIHRoZSBhcHByb3ByaWF0ZVxuICAgKiBjb2xsZWNpdG9uLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZWxOYW1lXG4gICAqICAgVGhlIGtleSBpbiB0aGUgcmVzcG9uc2Ugb2JqZWN0IHRoYXQgY29udGFpbnMgYSBtb2RlbCB0byBiZSBhZGRlZCB0byB0aGVcbiAgICogICBzcGVjaWZpZWQgY29sbGVjdGlvbi5cbiAgICogQHBhcmFtIHttaXhlZH0gY29sbGVjdGlvbkNhbGxiYWNrXG4gICAqICAgSWYgdGhlIHBhc3NlZCB2YWx1ZSBpcyBhIEJhY2tib25lLkNvbGxlY3Rpb24sIG1vZGVscyBpbiB0aGUgcmVzcG9uc2Ugd2lsbFxuICAgKiAgIGJlIGFkZGVkIGRpcmVjdGx5IHRvIHRoaXMgY29sbGVjdGlvbi4gSWYgdGhlIHBhc3NlZCB2YWx1ZSBpcyBhIGZ1bmN0aW9uLFxuICAgKiAgIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBtb2RlbCBhdHRyaWJ1dGVzIGluIHRoZVxuICAgKiAgIHJlc3BvbnNlIGFuZCBzaG91bGQgcmV0dXJuIHRoZSByZXNvbHZlZCBjb2xsZWN0aW9uLiBUaGUgbW9kZWwgd2lsbCBiZVxuICAgKiAgIGFkZGVkIHRvIHRoZSByZXNvbHZlZCBjb2xsZWN0aW9uIGluIHRoaXMgY2FzZS5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGFkZENvbGxlY3Rpb246IGZ1bmN0aW9uKG1vZGVsTmFtZSwgY29sbGVjdGlvbkNhbGxiYWNrKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbnNbbW9kZWxOYW1lXSA9IGNvbGxlY3Rpb25DYWxsYmFjaztcbiAgfSxcblxuICAvKipcbiAgICogUmVzb2x2ZXMgYSBkaXNwYXRjaGVkIHN5bmMgYWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2VcbiAgICogICBBIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlIGFjdGlvbiByZXNwb25zZS4gS2V5cyBpbiB0aGlzXG4gICAqICAgb2JqZWN0IHNob3VsZCBiZSBtb2RlbCBuYW1lcyBhcyBwYXNzZWQgdG8gdGhlIGFkZENvbGxlY3Rpb24gbWV0aG9kLiBUaGVcbiAgICogICB2YWx1ZXMgaW4gdGhpcyBvYmplY3Qgc2hvdWxkIGJlIG1vZGVscyB0byBiZSBhZGRlZCB0byB0aGUgYXNzb2NpYXRlZFxuICAgKiAgIGNvbGxlY3Rpb24uIEVhY2ggZW50cnkgaW4gdGhlIG9iamVjdCBzaG91bGQgY29udGFpbiBhIGphdmFzY3JpcHQgb2JqZWN0LFxuICAgKiAgIGtleWVkIGJ5IHRoZSBtb2RlbCdzIGlkLCBhbmQgY29udGFpbmcgdGhlIG1vZGVsIGF0dHJpYnV0ZXMgdG8gYmUgc2V0IGluXG4gICAqICAgdGhlIGNvbGxlY3Rpb24gYXMgYSB2YWx1ZS5cbiAgICpcbiAgICogICBbXG4gICAqICAgIHtcbiAgICogICAgICB0eXBlOiAnYXNzZXQnLFxuICAgKiAgICAgIGlkOiAnJyxcbiAgICogICAgICBhdHRyaWJ1dGVzOiAnJyxcbiAgICogICAgfSxcbiAgICogICBdXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICByZXNvbHZlOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIF8uZWFjaChyZXNwb25zZSwgZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgIGlmICh0aGlzLl9jb2xsZWN0aW9uc1ttb2RlbC50eXBlXSkge1xuICAgICAgICB0aGlzLl91cGRhdGVNb2RlbChtb2RlbCwgdGhpcy5fY29sbGVjdGlvbnNbbW9kZWwudHlwZV0pO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGRzIG1vZGVscyB0byBhIGNvbGxlY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBtb2RlbFxuICAgKiAgIEFuIG9iamVjdCB3aGVyZSBrZXlzIGFyZSBtb2RlbCBpZHMgYW5kIHZhbHVlcyBhcmUgbW9kZWwgYXR0cmlidXRlcy5cbiAgICogQHBhcmFtIHttaXhlZH0gY29sbGVjdGlvblxuICAgKiAgIENhbiBlaXRoZXIgYmUgYSBCYWNrYm9uZS5Db2xsZWN0aW9uIHRvIGFkZCB0aGUgbW9kZWwgdG8sIG9yIGEgY2FsbGJhY2tcbiAgICogICB3aGljaCByZXR1cm5zIHRoZSBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX3VwZGF0ZU1vZGVsOiBmdW5jdGlvbihtb2RlbCwgY29sbGVjdGlvbikge1xuICAgIHZhciByZXNvbHZlZENvbGxlY3Rpb24gPSBjb2xsZWN0aW9uO1xuXG4gICAgLy8gSWYgYSBmdW5jdGlvbiBpcyBwYXNzZWQgYXMgdGhlIGNvbGxlY3Rpb24sIHdlIGNhbGwgaXQgdG8gcmVzb2x2ZSB0aGVcbiAgICAvLyBhY3R1YWwgY29sbGVjdGlvbiBmb3IgdGhpcyBtb2RlbC5cbiAgICBpZiAodHlwZW9mIGNvbGxlY3Rpb24gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmVzb2x2ZWRDb2xsZWN0aW9uID0gY29sbGVjdGlvbihtb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICB9XG5cbiAgICAvLyBXZSBmaXJzdCB0cnkgdG8gbG9hZCB0aGUgZXhpc3RpbmcgbW9kZWwgaW5zdGVhZCBvZiBkaXJlY3RseSBzZXR0aW5nIHRoZVxuICAgIC8vIG1vZGVsIGluIGNvbGxlY3Rpb24gc2luY2UgaXQgaXMgY29tcGxldGVseSB2YWxpZCBmb3IgYSBtb2RlbCdzIGlkIHRvXG4gICAgLy8gY2hhbmdlLlxuICAgIHZhciBleGlzdGluZyA9IHJlc29sdmVkQ29sbGVjdGlvbi5nZXQobW9kZWwuaWQpO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgZXhpc3Rpbmcuc2V0KG1vZGVsLmF0dHJpYnV0ZXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICghbW9kZWwuYXR0cmlidXRlcy5pZCkge1xuICAgICAgICBtb2RlbC5hdHRyaWJ1dGVzLmlkID0gbW9kZWwuaWQ7XG4gICAgICB9XG4gICAgICByZXNvbHZlZENvbGxlY3Rpb24uYWRkKG1vZGVsLmF0dHJpYnV0ZXMpO1xuICAgIH1cbiAgfVxuXG59KTtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBAaW5oZXJpdGRvY1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsZW1lbnRGYWN0b3J5LCBtYXJrdXAsIGFjdGlvbnMpIHtcbiAgdmFyIGRpc3BsYXlFbGVtZW50ID0gZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd3aWRnZXQtZGlzcGxheScpO1xuICB2YXIgdG9vbGJhckVsZW1lbnQgPSBlbGVtZW50RmFjdG9yeS5jcmVhdGUoJ3Rvb2xiYXInKTtcbiAgdmFyIHRvb2xiYXJJdGVtRWxlbWVudCA9IGVsZW1lbnRGYWN0b3J5LmNyZWF0ZSgndG9vbGJhci1pdGVtJyk7XG4gIHZhciBjb21tYW5kRWxlbWVudCA9IGVsZW1lbnRGYWN0b3J5LmNyZWF0ZSgnd2lkZ2V0LWNvbW1hbmQnKTtcblxuICB2YXIgcmVzdWx0ID0gZGlzcGxheUVsZW1lbnQucmVuZGVyT3BlbmluZ1RhZygpXG4gICAgKyBtYXJrdXBcbiAgICArIHRvb2xiYXJFbGVtZW50LnJlbmRlck9wZW5pbmdUYWcoKTtcblxuICBfLmVhY2goYWN0aW9ucywgZnVuY3Rpb24oZGVmLCBpZCkge1xuICAgIHJlc3VsdCArPSB0b29sYmFySXRlbUVsZW1lbnQucmVuZGVyT3BlbmluZ1RhZygpXG4gICAgICArIGNvbW1hbmRFbGVtZW50LnNldEF0dHJpYnV0ZSgnPGNvbW1hbmQ+JywgaWQpLnJlbmRlck9wZW5pbmdUYWcoKSArIGRlZi50aXRsZSArIGNvbW1hbmRFbGVtZW50LnJlbmRlckNsb3NpbmdUYWcoKVxuICAgICAgKyB0b29sYmFySXRlbUVsZW1lbnQucmVuZGVyQ2xvc2luZ1RhZygpO1xuICB9KTtcblxuICByZXN1bHQgKz0gdG9vbGJhckVsZW1lbnQucmVuZGVyQ2xvc2luZ1RhZygpXG4gICAgKyBkaXNwbGF5RWxlbWVudC5yZW5kZXJDbG9zaW5nVGFnKCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICogQGluaGVyaXRkb2NcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgZmllbGRzLCBlZGl0cykge1xuICB2YXIgcmVzdWx0ID0gJyc7XG5cbiAgaWYgKGZpZWxkcykge1xuICAgIF8uZWFjaChmaWVsZHMsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gZWxlbWVudEZhY3RvcnkuY3JlYXRlKG5vZGUudHlwZSwgbm9kZSk7XG4gICAgICB2YXIgZWRpdDsgXG5cbiAgICAgIGlmIChub2RlLnR5cGUgPT0gJ2ZpZWxkJykge1xuICAgICAgICBpZiAobm9kZS5jb250ZXh0KSB7XG4gICAgICAgICAgZWRpdCA9IGVkaXRzW25vZGUuY29udGV4dF07XG4gICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJzxlZGl0YWJsZT4nLCAndHJ1ZScpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCc8ZWRpdGFibGU+JywgJ2ZhbHNlJyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmVzdWx0ICs9IGVsZW1lbnQucmVuZGVyT3BlbmluZ1RhZygpO1xuXG4gICAgICBpZiAoZWRpdCkge1xuICAgICAgICByZXN1bHQgKz0gZWRpdDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXN1bHQgKz0gbW9kdWxlLmV4cG9ydHMoZWxlbWVudEZhY3RvcnksIG5vZGUuY2hpbGRyZW4sIGVkaXRzKTtcbiAgICAgIH1cblxuICAgICAgcmVzdWx0ICs9IGVsZW1lbnQucmVuZGVyQ2xvc2luZ1RhZygpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIHZpZXcgZm9yIHdyYXBwaW5nIGNvbnRleHQgY29udGFpbmluZyBET00gbm9kZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG4vKipcbiAqIEJhY2tib25lIHZpZXcgZm9yIHVwZGF0aW5nIHRoZSBlZGl0b3IgZWxlbWVudC5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAYXVnbWVudHMgQmFja2JvbmUuTW9kZWxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbihhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLmVsZW1lbnRGYWN0b3J5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlcXVpcmVkIGVsZW1lbnRGYWN0b3J5IG9wdGlvbiBtaXNzaW5nLicpO1xuICAgIH1cblxuICAgIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gb3B0aW9ucy5lbGVtZW50RmFjdG9yeTtcblxuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgJ2NoYW5nZTppZCcsIHRoaXMucmVuZGVyKTtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsICdkZXN0cm95JywgdGhpcy5zdG9wTGlzdGVuaW5nKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW5kZXJzIHRoZSBlZGl0b3IgZWxlbWVudC5cbiAgICpcbiAgICogVGhpcyBqdXN0IGV4aXN0cyB0byBrZWVwIHRoZSBjb250ZXh0IGF0dHJpYnV0ZSBpbiBzeW5jIHdpdGggdGhlIGRhdGFcbiAgICogbW9kZWwuIFRoaXMgc2hvdWxkICpuZXZlciogY2hhbmdlIHRoZSBhY3R1YWwgY29udGVudHMgb2YgdGhlIHZpZXcgZWxlbWVudC5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCdmaWVsZCcpO1xuICAgIHRoaXMuJGVsLmF0dHIodGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZSgnPGNvbnRleHQ+JyksIHRoaXMubW9kZWwuZ2V0KCdjb250ZXh0JykpO1xuICAgIHRoaXMudHJpZ2dlcignRE9NTXV0YXRlJywgdGhpcywgdGhpcy4kZWwpO1xuICB9LFxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgdmlldyBmb3IgcmVwcmVzZW50aW5nIHdpZGdldHMgd2l0aGluIHRoZSBlZGl0b3IuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICAkID0gQmFja2JvbmUuJCxcbiAgV2lkZ2V0VmlldyA9IHJlcXVpcmUoJy4vV2lkZ2V0VmlldycpLFxuICB1bmltcGxlbWVudGVkID0gcmVxdWlyZSgnLi4vdW5pbXBsZW1lbnRlZCcpO1xuXG4vKipcbiAqIEJhY2tib25lIHZpZXcgZm9yIHJlcHJlc2VudGluZyB3aWRnZXRzIHdpdGhpbiB0aGUgZWRpdG9yLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBhdWdtZW50cyBCYWNrYm9uZS5Nb2RlbFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IFdpZGdldFZpZXcuZXh0ZW5kKHtcblxuICBwcm9jZXNzaW5nSW5kaWNhdG9yOiAnLi4uJyxcblxuICBhY3Rpb25zOiB7XG4gICAgZWRpdDoge1xuICAgICAgdGl0bGU6ICdFZGl0JyxcbiAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zYXZlKCkuZWRpdCgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVtb3ZlOiB7XG4gICAgICB0aXRsZTogJ1JlbW92ZScsXG4gICAgICBjYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIFdpZGdldFZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICAgIGlmIChvcHRpb25zLnByb2Nlc3NpbmdJbmRpY2F0b3IpIHtcbiAgICAgIHRoaXMucHJvY2Vzc2luZ0luZGljYXRvciA9IG9wdGlvbnMucHJvY2Vzc2luZ0luZGljYXRvcjtcbiAgICB9XG5cbiAgICB2YXIgd2lkZ2V0Q29tbWFuZFRlbXBsYXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ3dpZGdldC1jb21tYW5kJyk7XG4gICAgdGhpcy5jb21tYW5kU2VsZWN0b3IgPSB3aWRnZXRDb21tYW5kVGVtcGxhdGUuZ2V0U2VsZWN0b3IoKTtcbiAgICB0aGlzLmNvbW1hbmRBdHRyaWJ1dGUgPSB3aWRnZXRDb21tYW5kVGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZSgnPGNvbW1hbmQ+Jyk7XG5cbiAgICAvLyBTZXQgdXAgdGhlIGNoYW5nZSBoYW5kbGVyLlxuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgJ2NoYW5nZScsIHRoaXMuX2NoYW5nZUhhbmRsZXIpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgJ3JlYmFzZScsIHRoaXMuX3JlYmFzZSk7XG5cbiAgICB0aGlzLl9zdGFsZSA9IHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnRGYWN0b3J5fSBlbGVtZW50RmFjdG9yeVxuICAgKiAgIFRoZSBlbGVtZW50IGZhY3RvcnkgdGhhdCB3aWxsIGJlIHVzZWQgdG8gY3JlYXRlIGVsZW1lbnQgdGVtcGxhdGVzLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWFya3VwXG4gICAqICAgVGhlIG1hcmt1cCB0byBiZSByZW5kZXJlZCBmb3IgdGhlIHdpZGdldC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGFjdGlvbnNcbiAgICogICBBIG1hcHBpbmcgd2hlcmUgZWFjaCBrZXkgaXMgYW4gYWN0aW9uIG5hbWUsIGFuZCBlYWNoIGVudHJ5IGlzIGFuIG9iamVjdFxuICAgKiAgIGNvbnRhaW5pbmcgdGhlIGZvbGxvd2luZyBlbnRyaWVzOlxuICAgKiAgICAtIHRpdGxlOiBUaGUgdGl0bGUgdG8gZGlzcGxheSB0byB0aGUgdXNlci5cbiAgICogICAgLSBjYWxsYmFjazogVGhlIGNhbGxiYWNrIGZvciB3aGVuIHRoZSBhY3Rpb24gaXMgdHJpZ2dlcmVkLlxuICAgKi9cbiAgdGVtcGxhdGU6IGZ1bmN0aW9uKGVsZW1lbnRGYWN0b3J5LCBtYXJrdXAsIGFjdGlvbnMpIHtcbiAgICB1bmltcGxlbWVudGVkKGVsZW1lbnRGYWN0b3J5LCBtYXJrdXAsIGFjdGlvbnMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZVxuICAgKiAgIE9uZSBvZjpcbiAgICogICAgIC0gJ2R1cGxpY2F0aW5nJzogUmUtcmVuZGVycyB0aGUgZW50aXJlIHZpZXcgd2l0aCB0aGUgZHVwbGljYXRpbmdcbiAgICogICAgICAgaW5kaWNhdG9yLlxuICAgKiAgICAgLSAnY29udGFpbmVyJzogUmUtcmVuZGVycyB0aGUgY29udGFpbmVyIHdoaWxlIHByZXNlcnZlIHRoZSBleGlzdGluZ1xuICAgKiAgICAgICBpbmxpbmUgZWRpdGFibGUgRE9NLiBUaGlzIGVmZmVjdGl2ZWx5IHJlLXJlbmRlcnMgdGhlIGNvbnRhaW5lclxuICAgKiAgICAgICB3aXRob3V0IHRyaWdnZXJpbmcgYSByZS1yZW5kZXJcbiAgICogICAgIC0gJ2F0dHJpYnV0ZXMnOiBSZS1yZW5kZXJzIHRoZSB0b3AtbGV2ZWwgYXR0cmlidXRlcyBvbmx5LlxuICAgKiAgICAgLSAnYWxsJzogUmUtcmVuZGVycyBldmVyeXRoaW5nLiBUaGlzIHdpbGwgd2lwZSBvdXQgdGhlIHN0cnVjdHVyZSBvZlxuICAgKiAgICAgICBhbnkgZXhpc3RpbmcgZWRpdHMgYW5kIHN1Yi13aWRnZXRzLCBzbyBpdCdzIHJlYWxseSBvbmx5IHN1aXRhYmxlXG4gICAqICAgICAgIHdoZW4gdGhlIG1hcmt1cCBpcyBjb21wbGV0ZWx5IHN0YWxlLiBVc3VhbGx5LCAnY29udGFpbmVyJyBpcyBhXG4gICAqICAgICAgIGJldHRlciBvcHRpb24uXG4gICAqICAgSWYgbm8gbW9kZSBpcyBwcm92aWRlZCAnYWxsJyBpcyB1c2VkIGJ5IGRlZmF1bHQuXG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKG1vZGUpIHtcbiAgICB0aGlzLl9maW5kKHRoaXMuY29tbWFuZFNlbGVjdG9yKS5vZmYoKTtcblxuICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgY2FzZSAnZHVwbGljYXRpbmcnOlxuICAgICAgICB0aGlzLl9yZW5kZXJEdXBsaWNhdGluZygpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnY29udGFpbmVyJzpcbiAgICAgICAgdGhpcy5fcmVuZGVyQ29udGFpbmVyKCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdhdHRyaWJ1dGVzJzpcbiAgICAgICAgdGhpcy5fcmVuZGVyQXR0cmlidXRlcygpO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5fcmVuZGVyQWxsKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fY2xlYW51cFN0YWxlRWRpdGFibGVzKCk7XG4gICAgdGhpcy50cmlnZ2VyKCdET01SZW5kZXInLCB0aGlzLCB0aGlzLiRlbCk7XG4gICAgdGhpcy50cmlnZ2VyKCdET01NdXRhdGUnLCB0aGlzLCB0aGlzLiRlbCk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogVHJpZ2dlcnMgYW4gZWRpdCBjb21tYW5kIGRpc3BhdGNoLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZWRpdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb2RlbC5lZGl0KCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENsZWFucyB1cCB0aGUgdmlldyBhbmQgdHJpZ2dlcnMgdGhlIGRlc3RydWN0aW9uIG9mIHRoZSBhc3NvY2lhdGVkIHdpZGdldC5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIGlmICh0aGlzLm1vZGVsKSB7XG4gICAgICB0aGlzLnRyaWdnZXIoJ0RPTVJlbW92ZScsIHRoaXMsIHRoaXMuJGVsKTtcbiAgICAgIHRoaXMuX2NsZWFudXBTdGFsZUVkaXRhYmxlcyh0cnVlKTtcbiAgICAgIHZhciBtb2RlbCA9IHRoaXMubW9kZWw7XG4gICAgICB0aGlzLm1vZGVsID0gbnVsbDtcbiAgICAgIG1vZGVsLmRlc3Ryb3koKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbigpIHtcbiAgICAvLyBDbGVhbnVwIHRoZSBjb21tYW5kIGxpc3RlbmVycy4gQHNlZSBfcmVuZGVyQ29tbWFuZHMuXG4gICAgdGhpcy5fZmluZCh0aGlzLmNvbW1hbmRTZWxlY3Rvcikub2ZmKCk7XG4gICAgcmV0dXJuIFdpZGdldFZpZXcucHJvdG90eXBlLnN0b3BMaXN0ZW5pbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgZWRpdG9yIHZpZXcgaGFzIGJlZW4gcmVuZGVyZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2x9XG4gICAqICAgVHJ1ZSBpZiB0aGUgZWRpdG9yIHZpZXcgaGFzIGJlZW4gcmVuZGVyZWQgb24gdGhlIHJvb3cgZWxlbWVudCBvZiB0aGVcbiAgICogICB2aWV3LCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBpc0VkaXRvclZpZXdSZW5kZXJlZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuJGVsLmF0dHIodGhpcy52aWV3TW9kZUF0dHJpYnV0ZSkgPT0gJ2VkaXRvcic7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbmRlcnMgdGhlIHdpZGdldCBpbmRpY2F0aW5nIHRoZSBkYXRhIGVudGl0eSBpcyBiZWluZyBkdXBsaWNhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIF9yZW5kZXJEdXBsaWNhdGluZzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdET01SZW1vdmUnLCB0aGlzLCB0aGlzLiRlbC5jaGlsZHJlbigpKTtcbiAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5fZWxlbWVudEZhY3RvcnksIHRoaXMucHJvY2Vzc2luZ0luZGljYXRvciwgdGhpcy5hY3Rpb25zKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbmRlcnMgdGhlIG1hcmt1cCBmb3IgYSB3aWRnZXQgd2hpbGUgcHJlc2VydmluZyB0aGUgaW5saW5lIGVkaXRhYmxlIERPTS5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBfcmVuZGVyQ29udGFpbmVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9tRWRpdHMgPSB7fTtcbiAgICB0aGlzLl9pbmxpbmVFbGVtZW50VmlzaXRvcihmdW5jdGlvbigkZWwsIGNvbnRleHRTdHJpbmcpIHtcbiAgICAgIGRvbUVkaXRzW2NvbnRleHRTdHJpbmddID0gJGVsLmNvbnRlbnRzKCk7XG4gICAgfSk7XG5cbiAgICB2YXIgJG9sZENvbnRhaW5lciA9ICQoJzxkaXY+PC9kaXY+Jyk7XG4gICAgdmFyICRuZXdDb250YWluZXIgPSAkKCc8ZGl2PjwvZGl2PicpO1xuICAgIHZhciAkb2xkQ2hpbGRyZW4gPSB0aGlzLiRlbC5jaGlsZHJlbigpO1xuICAgIHRoaXMuJGVsLmFwcGVuZCgkb2xkQ29udGFpbmVyKTtcbiAgICB0aGlzLiRlbC5hcHBlbmQoJG5ld0NvbnRhaW5lcik7XG5cbiAgICAkb2xkQ29udGFpbmVyLmFwcGVuZCgkb2xkQ2hpbGRyZW4pO1xuICAgICRuZXdDb250YWluZXIuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMuX2VsZW1lbnRGYWN0b3J5LCB0aGlzLm1vZGVsLmdldCgnbWFya3VwJyksIHRoaXMuYWN0aW9ucykpOyBcbiAgICB0aGlzLl9maW5kKHRoaXMuaW5saW5lRWRpdG9yU2VsZWN0b3IsICRvbGRDb250YWluZXIpLmF0dHIodGhpcy5pbmxpbmVDb250ZXh0QXR0cmlidXRlLCAnJyk7XG5cbiAgICB0aGlzLl9pbmxpbmVFbGVtZW50VmlzaXRvcihmdW5jdGlvbigkZWwsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKSB7XG4gICAgICB0aGlzLl9hZGFwdGVyLmF0dGFjaElubGluZUVkaXRpbmcodGhpcywgY29udGV4dFN0cmluZywgc2VsZWN0b3IpO1xuXG4gICAgICBpZiAoZG9tRWRpdHNbY29udGV4dFN0cmluZ10pIHtcbiAgICAgICAgJGVsLmh0bWwoJycpLmFwcGVuZChkb21FZGl0c1tjb250ZXh0U3RyaW5nXSk7XG4gICAgICB9XG4gICAgfSwgJG5ld0NvbnRhaW5lcik7XG5cbiAgICB0aGlzLiRlbC5hcHBlbmQoJG5ld0NvbnRhaW5lci5jaGlsZHJlbigpKTtcbiAgICB0aGlzLnRyaWdnZXIoJ0RPTVJlbW92ZScsIHRoaXMsICRvbGRDb250YWluZXIpO1xuICAgICRvbGRDb250YWluZXIucmVtb3ZlKCk7XG4gICAgJG5ld0NvbnRhaW5lci5yZW1vdmUoKTtcblxuICAgIHJldHVybiB0aGlzLl9yZW5kZXJBdHRyaWJ1dGVzKCkuX3JlbmRlckNvbW1hbmRzKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbmRlcnMgZXZlcnl0aGluZywgaW5kaXNjcmltaW5hdGVseSBkZXN0cm95IHRoZSBleGlzdGluZyBET00gKGFuZCBlZGl0cykuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgX3JlbmRlckFsbDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdET01SZW1vdmUnLCB0aGlzLCB0aGlzLiRlbC5jaGlsZHJlbigpKTtcbiAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5fZWxlbWVudEZhY3RvcnksIHRoaXMubW9kZWwuZ2V0KCdtYXJrdXAnKSwgdGhpcy5hY3Rpb25zKSk7XG5cbiAgICB2YXIgZWRpdHMgPSB0aGlzLm1vZGVsLmdldCgnZWRpdHMnKTtcbiAgICB0aGlzLl9pbmxpbmVFbGVtZW50VmlzaXRvcihmdW5jdGlvbigkZWwsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKSB7XG4gICAgICBpZiAoZWRpdHNbY29udGV4dFN0cmluZ10pIHtcbiAgICAgICAgJGVsLmh0bWwoZWRpdHNbY29udGV4dFN0cmluZ10gPyBlZGl0c1tjb250ZXh0U3RyaW5nXSA6ICcnKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fYWRhcHRlci5hdHRhY2hJbmxpbmVFZGl0aW5nKHRoaXMsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzLl9yZW5kZXJBdHRyaWJ1dGVzKCkuX3JlbmRlckNvbW1hbmRzKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlLXJlbmRlcnMganVzdCB0aGUgYXR0cmlidXRlcyBvbiB0aGUgcm9vdCBlbGVtZW50LlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIF9yZW5kZXJBdHRyaWJ1dGVzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmNyZWF0ZSgnd2lkZ2V0Jywge1xuICAgICAgY29udGV4dDogdGhpcy5tb2RlbC5nZXQoJ2NvbnRleHRJZCcpLFxuICAgICAgdXVpZDogdGhpcy5tb2RlbC5nZXQoJ2l0ZW1JZCcpLFxuICAgICAgdmlld21vZGU6ICdlZGl0b3InLFxuICAgIH0pO1xuXG4gICAgXy5lYWNoKGVsZW1lbnQuZ2V0QXR0cmlidXRlcygpLCBmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgdGhpcy4kZWwuYXR0cihuYW1lLCB2YWx1ZSk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ0RPTU11dGF0ZScsIHRoaXMsIHRoaXMuJGVsKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBdHRhY2hlcyBjbGljayBoYW5kbGVycyBmb3IgZmlyaW5nIGNvbW1hbmRzLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIF9yZW5kZXJDb21tYW5kczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpZXcgPSB0aGlzO1xuICAgIHRoaXMuX2ZpbmQodGhpcy5jb21tYW5kU2VsZWN0b3IpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFjdGlvbiA9ICQodGhpcykuYXR0cih2aWV3LmNvbW1hbmRBdHRyaWJ1dGUpO1xuICAgICAgdmlldy5hY3Rpb25zW2FjdGlvbl0uY2FsbGJhY2suY2FsbCh2aWV3KTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogSGFuZGxlcyBjaGFuZ2VzIHRvIHRoZSB3aWRnZXQgbW9kZWwgYW5kIGludm9rZXMgdGhlIGFwcHJvcHJpYXRlIHJlbmRlcmVyLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX2NoYW5nZUhhbmRsZXI6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLm1vZGVsLnByZXZpb3VzKCdkdXBsaWNhdGluZycpKSB7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLm1vZGVsLmdldCgnZHVwbGljYXRpbmcnKSkge1xuICAgICAgdGhpcy5yZW5kZXIoJ2R1cGxpY2F0aW5nJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMubW9kZWwuaGFzQ2hhbmdlZCgnbWFya3VwJykpIHtcbiAgICAgIHRoaXMucmVuZGVyKCdjb250YWluZXInKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5tb2RlbC5oYXNDaGFuZ2VkKCdpdGVtSWQnKSB8fCB0aGlzLm1vZGVsLmhhc0NoYW5nZWQoJ2NvbnRleHRJZCcpKSB7XG4gICAgICB0aGlzLl9yZW5kZXIoJ2F0dHJpYnV0ZXMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogUmVhY3RzIHRvIGEgY29udGV4dCByZWJhc2UgZXZlbnQgYnkgdXBkYXRpbmcgdGhlIGFzc29jaWF0ZWQgRE9NIGVsZW1lbnQuXG4gICAqXG4gICAqIEBzZWUgV2lkZ2V0TW9kZWxcbiAgICpcbiAgICogQHBhcmFtIHtCYWNrYm9uZS5Nb2RlbH0gbW9kZWxcbiAgICogICBUaGUgY2hhbmdlZCBtb2RlbC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG9sZElkXG4gICAqICAgVGhlIG9sZCBjb250ZXh0IGlkLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3SWRcbiAgICogICBUaGUgbmV3IGNvbnRleHQgaWQuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgX3JlYmFzZTogZnVuY3Rpb24obW9kZWwsIG9sZElkLCBuZXdJZCkge1xuICAgIGlmICghbW9kZWwpIHtcbiAgICAgIG1vZGVsID0gdGhpcy5tb2RlbDtcbiAgICB9XG5cbiAgICB0aGlzLl9pbmxpbmVFbGVtZW50VmlzaXRvcihmdW5jdGlvbigkZWwsIGNvbnRleHRTdHJpbmcpIHtcbiAgICAgIGlmIChjb250ZXh0U3RyaW5nID09IG9sZElkKSB7XG4gICAgICAgICRlbC5hdHRyKHRoaXMuaW5saW5lQ29udGV4dEF0dHJpYnV0ZSwgbmV3SWQpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ0RPTU11dGF0ZScsIHRoaXMsICRlbCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5fc3RhbGVbb2xkSWRdID0gdHJ1ZTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIGVkaXRvciBpbXBsZW1lbnRhdGlvbiB0byBmcmVlIGlubGluZSBlZGl0aW5nIGRhdGEgc3RydWN0dXJlcy5cbiAgICpcbiAgICogQHBhcmFtIHtib29sfSBoYXJkXG4gICAqICAgV2hldGhlciBvciBub3QgdG8gZm9yY2UgYWxsIGlubGluZSBlZGl0YWJsZXMgdG8gYmUgZGVzdHJveWVkLiBEZWZhdWx0c1xuICAgKiAgIHRvIGZhbHNlLlxuICAgKlxuICAgKiBAcmV0dXJuIHt0aGlzfVxuICAgKiAgIFRoZSB0aGlzIG9iamVjdCBmb3IgY2FsbC1jaGFpbmluZy5cbiAgICovXG4gIF9jbGVhbnVwU3RhbGVFZGl0YWJsZXM6IGZ1bmN0aW9uKGhhcmQpIHtcbiAgICBpZiAoaGFyZCkge1xuICAgICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0SWQsIHNlbGVjdG9yKSB7XG4gICAgICAgIHRoaXMuX2FkYXB0ZXIuZGV0YWNoSW5saW5lRWRpdGluZyh0aGlzLCBjb250ZXh0SWQsIHNlbGVjdG9yKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIF8uZWFjaCh0aGlzLl9zdGFsZSwgZnVuY3Rpb24odW51c2VkLCBjb250ZXh0SWQpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gdGhpcy5faW5saW5lRWxlbWVudFNlbGVjdG9yKGNvbnRleHRJZCk7XG4gICAgICAgIHRoaXMuX2FkYXB0ZXIuZGV0YWNoSW5saW5lRWRpdGluZyh0aGlzLCBjb250ZXh0SWQsIHNlbGVjdG9yKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cblxuICAgIHRoaXMuX3N0YWxlID0ge307XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIHZpZXcgZm9yIHJlcHJlc2VudGluZyB0aGUgZXhwb3J0ZWQgZGF0YSBzdGF0ZSBvZiBhIHdpZGdldC5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBXaWRnZXRWaWV3ID0gcmVxdWlyZSgnLi9XaWRnZXRWaWV3JyksXG4gIHVuaW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91bmltcGxlbWVudGVkJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gV2lkZ2V0Vmlldy5leHRlbmQoe1xuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIFdpZGdldFZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICAgIHRoaXMuYXR0cmlidXRlV2hpdGVsaXN0ID0gXy5pbnZlcnQodGhpcy53aWRnZXRUZW1wbGF0ZS5nZXRBdHRyaWJ1dGVOYW1lcygpKTtcbiAgICBkZWxldGUgdGhpcy5hdHRyaWJ1dGVXaGl0ZWxpc3RbdGhpcy53aWRnZXRUZW1wbGF0ZS5nZXRBdHRyaWJ1dGVOYW1lKCc8dmlld21vZGU+JyldO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnRGYWN0b3J5fSBlbGVtZW50RmFjdG9yeVxuICAgKiAgIFRoZSBmYWN0b3J5IHVzZWQgdG8gY3JlYXRlIERPTSBlbGVtZW50IHRlbXBsYXRlcy5cbiAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkc1xuICAgKiAgIEEgbWFwIG9mIHRoZSBmaWVsZCAvIGRhdGEgc3RydWN0dXJlIG9mIHRoZSB3aWRnZXQgdG8gb3V0cHV0IHRhZ3MgZm9yLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZWRpdHNcbiAgICogICBBIG1hcCBvZiBjb250ZXh0IGlkcyB0byBpbmxpbmUgZWRpdHMgdGhhdCBoYXZlIGJlZW4gbWFkZSBmb3IgdGhhdFxuICAgKiAgIGNvbnRleHQuXG4gICAqL1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIGZpZWxkcywgZWRpdHMpIHtcbiAgICB1bmltcGxlbWVudGVkKGVsZW1lbnRGYWN0b3J5LCBmaWVsZHMsIGVkaXRzKTtcbiAgfSxcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpZXcgPSB0aGlzO1xuICAgIHZhciBmaWVsZHMgPSB0aGlzLm1vZGVsLmVkaXRCdWZmZXJJdGVtUmVmLmVkaXRCdWZmZXJJdGVtLmdldCgnZmllbGRzJyk7XG4gICAgdmFyIGVkaXRzID0gdGhpcy5tb2RlbC5nZXQoJ2VkaXRzJyk7XG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMuX2VsZW1lbnRGYWN0b3J5LCBmaWVsZHMsIGVkaXRzKSk7XG4gICAgXy5lYWNoKHRoaXMuZWwuYXR0cmlidXRlcywgZnVuY3Rpb24oYXR0cikge1xuICAgICAgaWYgKF8uaXNVbmRlZmluZWQodmlldy5hdHRyaWJ1dGVXaGl0ZWxpc3RbYXR0ci5uYW1lXSkpIHtcbiAgICAgICAgdmlldy4kZWwucmVtb3ZlQXR0cihhdHRyLm5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGEgbW9kZWwgZm9yIHJlcHJlc2VudGluZyB3aWRnZXRzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgJCA9IEJhY2tib25lLiQsXG4gIHVuaW1wbGVtZW50ZWQgPSByZXF1aXJlKCcuLi91bmltcGxlbWVudGVkJyk7XG5cbi8qKlxuICogQmFja2JvbmUgdmlldyBmb3IgcmVwcmVzZW50aW5nIHdpZGdldHMgd2l0aGluIHRoZSBlZGl0b3IuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucy5hZGFwdGVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlcXVpcmVkIGFkYXB0ZXIgb3B0aW9uIG1pc3NpbmcuJyk7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLmVsZW1lbnRGYWN0b3J5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlcXVpcmVkIGVsZW1lbnRGYWN0b3J5IG9wdGlvbiBtaXNzaW5nLicpO1xuICAgIH1cblxuICAgIGlmICghb3B0aW9ucy50ZW1wbGF0ZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXF1aXJlZCB0ZW1wbGF0ZSBvcHRpb24gbWlzc2luZy4nKTtcbiAgICB9XG5cbiAgICB0aGlzLl9hZGFwdGVyID0gb3B0aW9ucy5hZGFwdGVyO1xuICAgIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gb3B0aW9ucy5lbGVtZW50RmFjdG9yeTtcbiAgICB0aGlzLnRlbXBsYXRlID0gb3B0aW9ucy50ZW1wbGF0ZTtcblxuICAgIC8vIEdldCBhIGxpc3Qgb2YgdGVtcGxhdGVzIHRoYXQgd2lsbCBiZSB1c2VkLlxuICAgIHRoaXMud2lkZ2V0VGVtcGxhdGUgPSB0aGlzLl9lbGVtZW50RmFjdG9yeS5nZXRUZW1wbGF0ZSgnd2lkZ2V0Jyk7XG4gICAgdGhpcy5maWVsZFRlbXBsYXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ2ZpZWxkJyk7XG4gICAgdGhpcy53aWRnZXRDb21tYW5kVGVtcGxhdGUgPSB0aGlzLl9lbGVtZW50RmFjdG9yeS5nZXRUZW1wbGF0ZSgnd2lkZ2V0LWNvbW1hbmQnKTtcblxuICAgIC8vIFNldCB1cCBhdHRyaWJ1dGUgLyBlbGVtZW50IHNlbGVjdG9ycy5cbiAgICB0aGlzLndpZGdldFNlbGVjdG9yID0gdGhpcy53aWRnZXRUZW1wbGF0ZS5nZXRTZWxlY3RvcigpO1xuICAgIHRoaXMudmlld01vZGVBdHRyaWJ1dGUgPSB0aGlzLndpZGdldFRlbXBsYXRlLmdldEF0dHJpYnV0ZU5hbWUoJzx2aWV3bW9kZT4nKTtcbiAgICB0aGlzLmlubGluZUNvbnRleHRBdHRyaWJ1dGUgPSB0aGlzLmZpZWxkVGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZSgnPGNvbnRleHQ+Jyk7XG4gICAgdGhpcy5pbmxpbmVFZGl0b3JTZWxlY3RvciA9IHRoaXMuZmllbGRUZW1wbGF0ZS5nZXRTZWxlY3RvcigpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgdGhlIEhUTUwgY29udGVudCBmb3IgdGhlIHJvb3QgZWxlbWVudC5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKiAgIFRoZSBodG1sIG1hcmt1cCB0byBhcHBseSBpbnNpZGUgdGhlIHJvb3QgZWxlbWVudC5cbiAgICovXG4gIHRlbXBsYXRlOiBmdW5jdGlvbigpIHtcbiAgICB1bmltcGxlbWVudGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbmRlcnMgdGhlIHdpZGdldC5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHVuaW1wbGVtZW50ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogU2F2ZXMgaW5saW5lIGVkaXRzIGN1cnJlbnRseSBpbiB0aGUgRE9NIHRvIHRoZSBtb2RlbC5cbiAgICpcbiAgICogQHJldHVybiB7dGhpc31cbiAgICogICBUaGUgdGhpcyBvYmplY3QgZm9yIGNhbGwtY2hhaW5pbmcuXG4gICAqL1xuICBzYXZlOiBmdW5jdGlvbigpIHtcblxuICAgIGlmICghdGhpcy5tb2RlbC5nZXQoJ2R1cGxpY2F0aW5nJykpIHtcbiAgICAgIHZhciBlZGl0cyA9IHt9O1xuICAgICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcikge1xuICAgICAgICBlZGl0c1tjb250ZXh0U3RyaW5nXSA9IHRoaXMuX2FkYXB0ZXIuZ2V0SW5saW5lRWRpdCh0aGlzLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcik7XG4gICAgICB9KTtcbiAgICAgIHRoaXMubW9kZWwuc2V0KHtlZGl0czogZWRpdHN9LCB7c2lsZW50OiB0cnVlfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIC8vIFdlIG92ZXJyaWRlIHRoZSBkZWZhdWx0IHJlbW92ZSBmdW5jdGlvbiB0byBwcmV2ZW50IGRlc3RydWN0aW9uIG9mIHRoZVxuICAgIC8vIHdpZGdldCBieSBkZWZhdWx0IHdoZW4gdGhlIHZpZXcgaXMgcmVtb3ZlZC5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgaW5saW5lIGVsZW1lbnQgc2VsZWN0b3IgZm9yIGEgZ2l2ZW4gY29udGV4dCBpZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRleHRJZFxuICAgKiAgIFRoZSBjb250ZXh0IGlkIHRvIGdldCB0aGUgc2VsZWN0b3IgZm9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqICAgQSBqUXVlcnkgc2VsZWN0b3IgZm9yIGEgZ2l2ZW4gY29udGV4dElkLlxuICAgKi9cbiAgX2lubGluZUVsZW1lbnRTZWxlY3RvcjogZnVuY3Rpb24oY29udGV4dElkKSB7XG4gICAgcmV0dXJuICdbJyArIHRoaXMuaW5saW5lQ29udGV4dEF0dHJpYnV0ZSArICc9XCInICsgY29udGV4dElkICsgJ1wiXSc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEEgdmlzaXRvciBmdW5jdGlvbiBmb3IgcHJvY2Vzc2luZyBpbmxpbmUgZWRpdGFibGUgZWxlbWVudHMuXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAqICAgQSBjYWxsYmFjayB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBpbmxpbmUgZWxlbWVudCBpbiB0aGUgRE9NLFxuICAgKiAgIHdpdGggdGhyZWUgYXJndW1lbnRzOlxuICAgKiAgICAtICRlbCB7alF1ZXJ5fSBUaGUgaW5saW5lIGVsZW1lbnQuXG4gICAqICAgIC0gY29udGV4dElkOiBUaGUgY29udGV4dCBpZCBhc3NvY2lhdGVkIHdpdGggdGhlIGlubGluZSBlbGVtZW50LlxuICAgKiAgICAtIHNlbGVjdG9yOiBBIHNlbGVjdG9yIGZvciBsb2NhdGluZyB0aGUgZWxlbWVudCBpbiB0aGUgRE9NLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvb3RFbFxuICAgKiAgIFRoZSByb290IGVsZW1lbnQgdG8gc2VhcmNoIGZvciBpbmxpbmUgZWRpdGFibGVzIGluc2lkZS4gSWYgbm9uZSBpc1xuICAgKiAgIHByb3ZpZGVkLCB0aGUgd2lkZ2V0IHJvb3QgZWxlbWVudCBpcyB1c2VkIGJ5IGRlZmF1bHQuXG4gICAqXG4gICAqIEByZXR1cm4ge3RoaXN9XG4gICAqICAgVGhlIHRoaXMgb2JqZWN0IGZvciBjYWxsLWNoYWluaW5nLlxuICAgKi9cbiAgX2lubGluZUVsZW1lbnRWaXNpdG9yOiBmdW5jdGlvbihjYWxsYmFjaywgJHJvb3RFbCkge1xuICAgIGlmICghJHJvb3RFbCkge1xuICAgICAgJHJvb3RFbCA9IHRoaXMuJGVsO1xuICAgIH1cblxuICAgIHZhciB2aWV3ID0gdGhpcztcbiAgICB0aGlzLl9maW5kKHRoaXMuaW5saW5lRWRpdG9yU2VsZWN0b3IsICRyb290RWwpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY29udGV4dFN0cmluZyA9ICQodGhpcykuYXR0cih2aWV3LmlubGluZUNvbnRleHRBdHRyaWJ1dGUpO1xuICAgICAgdmFyIHNlbGVjdG9yID0gdmlldy5faW5saW5lRWxlbWVudFNlbGVjdG9yKGNvbnRleHRTdHJpbmcpO1xuICAgICAgY2FsbGJhY2suY2FsbCh2aWV3LCAkKHRoaXMpLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogQSBmaW5kIHdyYXBwZXIgZm9yIGpRdWVyeSB0aGF0IHNlYXJjaGVzIG9ubHkgd2l0aGluIHRoZSBjb250ZXh0IG9mIHRoZVxuICAgKiB3aWRnZXQgdGhpcyB2aWV3IGlzIGFzc29jaWF0ZWQgd2l0aC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yXG4gICAqICAgVGhlIHNlbGVjdG9yIHRvIHNlYXJjaCB3aXRoLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvb3RFbFxuICAgKiAgIFRoZSByb290IGVsZW1lbnQgdG8gc2VhcmNoIGluc2lkZS4gSWYgbm9uZSBpcyBwcm92aWRlZCwgdGhlIHdpZGdldCByb290XG4gICAqICAgZWxlbWVudCBpcyB1c2VkIGJ5IGRlZmF1bHQuXG4gICAqXG4gICAqIEByZXR1cm4ge2pRdWVyeX1cbiAgICogICBBIGpRdWVyeSB3cmFwcGVyIG9iamVjdCBjb250YWluaW5nIGFueSBtYXRjaGluZyBlbGVtZW50cy5cbiAgICovXG4gIF9maW5kOiBmdW5jdGlvbihzZWxlY3RvciwgJHJvb3RFbCkge1xuICAgIHZhciB2aWV3ID0gdGhpcztcbiAgICB2YXIgJHJlc3VsdCA9ICQoW10pO1xuXG4gICAgaWYgKCEkcm9vdEVsKSB7XG4gICAgICAkcm9vdEVsID0gdGhpcy4kZWw7XG4gICAgfVxuXG4gICAgJHJvb3RFbC5jaGlsZHJlbigpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGNoaWxkID0gJCh0aGlzKTtcbiAgICAgIGlmICgkY2hpbGQuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICRyZXN1bHQgPSAkcmVzdWx0LmFkZCgkY2hpbGQpO1xuICAgICAgfVxuICAgICAgaWYgKCEkY2hpbGQuaXModmlldy53aWRnZXRTZWxlY3RvcikpIHtcbiAgICAgICAgJHJlc3VsdCA9ICRyZXN1bHQuYWRkKHZpZXcuX2ZpbmQoc2VsZWN0b3IsICRjaGlsZCkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuICRyZXN1bHQ7XG4gIH0sXG5cbn0pO1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIG5hbWU6ICdkZWZhdWx0JyxcblxuICBzZXJ2aWNlUHJvdG90eXBlczoge1xuICAgICdCaW5kZXInOiByZXF1aXJlKCcuL0JpbmRlcicpLFxuICAgICdDb21tYW5kRW1pdHRlcic6IHJlcXVpcmUoJy4vRWRpdG9yL0NvbW1hbmQvQ29tbWFuZEVtaXR0ZXInKSxcbiAgICAnQ29udGV4dENvbGxlY3Rpb24nOiByZXF1aXJlKCcuL0NvbGxlY3Rpb25zL0NvbnRleHRDb2xsZWN0aW9uJyksXG4gICAgJ0NvbnRleHRMaXN0ZW5lcic6IHJlcXVpcmUoJy4vQ29udGV4dC9Db250ZXh0TGlzdGVuZXInKSxcbiAgICAnQ29udGV4dFJlc29sdmVyJzogcmVxdWlyZSgnLi9Db250ZXh0L0NvbnRleHRSZXNvbHZlcicpLFxuICAgICdFZGl0QnVmZmVySXRlbVJlZkZhY3RvcnknOiByZXF1aXJlKCcuL0VkaXRCdWZmZXIvRWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5JyksXG4gICAgJ0VkaXRCdWZmZXJNZWRpYXRvcic6IHJlcXVpcmUoJy4vRWRpdEJ1ZmZlci9FZGl0QnVmZmVyTWVkaWF0b3InKSxcbiAgICAnRWRpdG9yQ29sbGVjdGlvbic6IHJlcXVpcmUoJy4vQ29sbGVjdGlvbnMvRWRpdG9yQ29sbGVjdGlvbicpLFxuICAgICdFbGVtZW50RmFjdG9yeSc6IHJlcXVpcmUoJy4vRWxlbWVudC9FbGVtZW50RmFjdG9yeScpLFxuICAgICdTY2hlbWFDb2xsZWN0aW9uJzogcmVxdWlyZSgnLi9Db2xsZWN0aW9ucy9TY2hlbWFDb2xsZWN0aW9uJyksXG4gICAgJ1N5bmNBY3Rpb25EaXNwYXRjaGVyJzogcmVxdWlyZSgnLi9TeW5jQWN0aW9uL1N5bmNBY3Rpb25EaXNwYXRjaGVyJyksXG4gICAgJ1N5bmNBY3Rpb25SZXNvbHZlcic6IHJlcXVpcmUoJy4vU3luY0FjdGlvbi9TeW5jQWN0aW9uUmVzb2x2ZXInKSxcbiAgICAnV2lkZ2V0RmFjdG9yeSc6IHJlcXVpcmUoJy4vRWRpdG9yL1dpZGdldC9XaWRnZXRGYWN0b3J5JyksXG4gICAgJ1dpZGdldFN0b3JlJzogcmVxdWlyZSgnLi9FZGl0b3IvV2lkZ2V0L1dpZGdldFN0b3JlJyksXG4gICAgJ1dpZGdldFZpZXdGYWN0b3J5JzogcmVxdWlyZSgnLi9FZGl0b3IvV2lkZ2V0L1dpZGdldFZpZXdGYWN0b3J5JyksXG4gICAgJ0VkaXRvclZpZXcnOiByZXF1aXJlKCcuL1ZpZXdzL0VkaXRvclZpZXcnKSxcbiAgfSxcblxuICB2aWV3czoge1xuICAgICdlZGl0b3InOiB7XG4gICAgICBwcm90b3R5cGU6IHJlcXVpcmUoJy4vVmlld3MvV2lkZ2V0RWRpdG9yVmlldycpLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9UZW1wbGF0ZXMvV2lkZ2V0RWRpdG9yVmlld1RlbXBsYXRlJyksXG4gICAgICB9XG4gICAgfSxcbiAgICAnZXhwb3J0Jzoge1xuICAgICAgcHJvdG90eXBlOiByZXF1aXJlKCcuL1ZpZXdzL1dpZGdldE1lbWVudG9WaWV3JyksXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIHRlbXBsYXRlOiByZXF1aXJlKCcuL1RlbXBsYXRlcy9XaWRnZXRNZW1lbnRvVmlld1RlbXBsYXRlJyksXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG5cbiAgcGx1Z2luczoge1xuICAgIGFkYXB0ZXI6IHt9LFxuICAgIHByb3RvY29sOiB7fSxcbiAgfSxcblxuICBlbGVtZW50czoge1xuICAgICd3aWRnZXQnOiB7XG4gICAgICB0YWc6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnZGF0YS11dWlkJzogJzx1dWlkPicsXG4gICAgICAgICdkYXRhLWNvbnRleHQtaGludCc6ICc8Y29udGV4dD4nLFxuICAgICAgICAnZGF0YS12aWV3bW9kZSc6ICc8dmlld21vZGU+JyxcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItd2lkZ2V0J1xuICAgICAgfSxcbiAgICAgIHNlbGVjdG9yOiAnLndpZGdldC1iaW5kZXItd2lkZ2V0W2RhdGEtY29udGV4dC1oaW50XScsXG4gICAgfSxcbiAgICAnZmllbGQnOiB7XG4gICAgICB0YWc6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnZGF0YS1maWVsZC1uYW1lJzogJzxuYW1lPicsXG4gICAgICAgICdkYXRhLWNvbnRleHQnOiAnPGNvbnRleHQ+JyxcbiAgICAgICAgJ2RhdGEtbXV0YWJsZSc6ICc8ZWRpdGFibGU+JyxcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItZmllbGQnXG4gICAgICB9LFxuICAgICAgc2VsZWN0b3I6ICcud2lkZ2V0LWJpbmRlci1maWVsZFtkYXRhLW11dGFibGU9XCJ0cnVlXCJdJyxcbiAgICB9LFxuICAgICd3aWRnZXQtZGlzcGxheSc6IHtcbiAgICAgIHRhZzogJ2RpdicsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICdjbGFzcyc6ICd3aWRnZXQtYmluZGVyLXdpZGdldF9fZGlzcGxheScsXG4gICAgICB9XG4gICAgfSxcbiAgICAndG9vbGJhcic6IHtcbiAgICAgIHRhZzogJ3VsJyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItdG9vbGJveCcsXG4gICAgICB9XG4gICAgfSxcbiAgICAndG9vbGJhci1pdGVtJzoge1xuICAgICAgdGFnOiAnbGknLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnY2xhc3MnOiAnd2lkZ2V0LWJpbmRlci10b29sYm94X19pdGVtJyxcbiAgICAgIH1cbiAgICB9LFxuICAgICd3aWRnZXQtY29tbWFuZCc6IHtcbiAgICAgIHRhZzogJ2EnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnY2xhc3MnOiAnd2lkZ2V0LWJpbmRlci1jb21tYW5kJyxcbiAgICAgICAgJ2RhdGEtY29tbWFuZCc6ICc8Y29tbWFuZD4nLFxuICAgICAgICAnaHJlZic6ICcjJyxcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZGF0YToge1xuICAgIGNvbnRleHQ6IHt9LFxuICAgIHNjaGVtYToge30sXG4gIH1cbn07XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIHBhY2thZ2UgZm9yIG1hbmFnaW5nIHNlcnZlciAvIGNsaWVudCBkYXRhIGJpbmRpbmcgZm9yIGVkaXRvciB3aWRnZXRzLiBcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICAkID0gcmVxdWlyZSgnanF1ZXJ5Jyk7XG5cbi8qKlxuICogVGhlIHdpZGdldC1zeW5jIGxpYnJhcnkgYXBwbGljYXRpb24gcm9vdCBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZ1xuICogICBBIG1hcCBvZiBjb25maWd1cmF0aW9uLiBTZWUgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiBhcyBhIHJlZmVyZW5jZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgaWYgKCFjb25maWcpIHtcbiAgICBjb25maWcgPSB7fTtcbiAgfVxuICB0aGlzLl9pbml0aWFsaXplKGNvbmZpZyk7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cywge1xuXG4gIGRlZmF1bHRzOiByZXF1aXJlKCcuL2NvbmZpZycpLFxuXG4gIFBsdWdpbkludGVyZmFjZToge1xuICAgIEVkaXRvckFkYXB0ZXI6IHJlcXVpcmUoJy4vUGx1Z2lucy9FZGl0b3JBZGFwdGVyJyksXG4gICAgU3luY1Byb3RvY29sOiByZXF1aXJlKCcuL1BsdWdpbnMvU3luY1Byb3RvY29sJyksXG4gIH0sXG5cbiAgLyoqXG4gICAqIEEgY29udmVuaWVuY2UgZmFjdG9yeSBtZXRob2QgdG8gY3JlYXRlIHRoZSBXaWRnZXRCaW5kZXIgYXBwbGljYXRpb24gcm9vdC5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZ1xuICAgKiAgIEEgbWFwIG9mIGNvbmZpZ3VyYXRpb24uIFNlZSB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIGFzIGEgcmVmZXJlbmNlLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRCaW5kZXJ9XG4gICAqICAgVGhlIHJvb3QgV2lkZ2V0QmluZGVyIGxpYnJhcnkgb2JqZWN0LlxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbihjb25maWcpIHtcbiAgICByZXR1cm4gbmV3IG1vZHVsZS5leHBvcnRzKGNvbmZpZyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBjb3B5IG9mIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gYW5kIHJldHVybnMgaXQuXG4gICAqXG4gICAqIENhbGwgdGhpcyBtZXRob2QgdG8gYXZvaWQgYWNjaWRlbnRseSBtYWtpbmcgY2hhbmdlcyB0byB0aGUgZGVmYXVsdFxuICAgKiBjb25maWd1cmF0aW9uIG9iamVjdC5cbiAgICpcbiAgICogQHJldHVybiB7b2JqZWN0fVxuICAgKiAgIEEgY29weSBvZiB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIG9iamVjdC5cbiAgICovXG4gIGNvbmZpZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlZmF1bHRzID0gbW9kdWxlLmV4cG9ydHMuZGVmYXVsdHM7XG4gICAgdmFyIGNvbmZpZyA9IHt9O1xuICAgIGNvbmZpZy5zZXJ2aWNlUHJvdG90eXBlcyA9IHt9O1xuICAgIF8uZGVmYXVsdHMoY29uZmlnLnNlcnZpY2VQcm90b3R5cGVzLCBkZWZhdWx0cy5zZXJ2aWNlUHJvdG90eXBlcyk7XG4gICAgY29uZmlnLnZpZXdzID0ge307XG4gICAgXy5lYWNoKGRlZmF1bHRzLnZpZXdzLCBmdW5jdGlvbihkZWYsIG5hbWUpIHtcbiAgICAgIGNvbmZpZy52aWV3c1tuYW1lXSA9IHsgb3B0aW9uczoge30gfTtcbiAgICAgIF8uZGVmYXVsdHMoY29uZmlnLnZpZXdzW25hbWVdLm9wdGlvbnMsIGRlZi5vcHRpb25zKTtcbiAgICAgIF8uZGVmYXVsdHMoY29uZmlnLnZpZXdzW25hbWVdLCBkZWYpO1xuICAgIH0pO1xuICAgIGNvbmZpZy5wbHVnaW5zID0ge307XG4gICAgXy5kZWZhdWx0cyhjb25maWcucGx1Z2lucywgZGVmYXVsdHMucGx1Z2lucyk7XG4gICAgJC5leHRlbmQodHJ1ZSwgY29uZmlnLmVsZW1lbnRzLCBkZWZhdWx0cy5lbGVtZW50cyk7XG4gICAgY29uZmlnLmRhdGEgPSB7fTtcbiAgICBfLmRlZmF1bHRzKGNvbmZpZy5kYXRhLCBkZWZhdWx0cy5kYXRhKTtcbiAgICBfLmRlZmF1bHRzKGNvbmZpZywgZGVmYXVsdHMpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn0pO1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogR2V0cyB0aGUgZWxlbWVudCBmYWN0b3J5LlxuICAgKlxuICAgKiBAcmV0dXJuIHtFbGVtZW50RmFjdG9yeX1cbiAgICogICBUaGUgZWxlbWVudCBmYWN0b3J5IHVzZWQgdG8gY3JlYXRlIGVsZW1lbnQgdGVtcGxhdGVzIGFuZCBpbnN0YW5jZXMuXG4gICAqL1xuICBnZXRFbGVtZW50RmFjdG9yeTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VsZW1lbnRGYWN0b3J5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBjb250ZXh0IGNvbGxlY3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm4ge0NvbnRleHRDb2xsZWN0aW9ufVxuICAgKiAgIFRoZSBjb2xsZWN0aW9uIG9mIGFsbCBjb250ZXh0cyByZWZlcmVuY2VkIGluIGV2ZXJ5IGJvdW5kIGVkaXRvci5cbiAgICovXG4gIGdldENvbnRleHRzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29udGV4dENvbGxlY3Rpb247XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHNjaGVtYSBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHtTY2hlbWFDb2xsZWN0aW9ufVxuICAgKiAgIFRoZSBjb2xsZWN0aW9uIG9mIGFsbCBzY2hlbWEgbm9kZXMuXG4gICAqL1xuICBnZXRTY2hlbWE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zY2hlbWFDb2xsZWN0aW9uO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBlZGl0b3IgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7RWRpdG9yQ29sbGVjdGlvbn1cbiAgICogICBUaGUgY29sbGVjdGlvbiBvZiBhbGwgYXNzb2NpYXRlZCBlZGl0b3JzLlxuICAgKi9cbiAgZ2V0RWRpdG9yczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VkaXRvckNvbGxlY3Rpb247XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHN5bmMgYWN0aW9uIGRpc3BhdGNoZXIuXG4gICAqXG4gICAqIEByZXR1cm4ge1N5bmNBY3Rpb25EaXNwYXRjaGVyfVxuICAgKiAgIFRoZSBkaXNwYXRjaGVyIGZvciBkaXNwYXRjaGluZyBlZGl0b3IgY29tbWFuZHMuXG4gICAqL1xuICBnZXRTeW5jQWN0aW9uRGlzcGF0Y2hlcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N5bmNBY3Rpb25EaXNwYXRjaGVyO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBzeW5jIGFjdGlvbiByZXNvbHZlci5cbiAgICpcbiAgICogQHJldHVybiB7U3luY0FjdGlvblJlc29sdmVyfVxuICAgKiAgIFRoZSByZXNvbHZlciBmb3IgcmVzb2x2aW5nIHN5bmMgYWN0aW9uIGNvbW1hbmRzLlxuICAgKi9cbiAgZ2V0U3luY0FjdGlvblJlc29sdmVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3luY0FjdGlvblJlc29sdmVyO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVucyBhIHdpZGdldCBiaW5kZXIgZm9yIGEgZ2l2ZW4gZWRpdG9yLlxuICAgKlxuICAgKiBUbyBjbG9zZSB0aGUgYmluZGVyIGxhdGVyLCBjYWxsIGJpbmRlci5jbG9zZSgpLlxuICAgKlxuICAgKiBAc2VlIEJpbmRlclxuICAgKlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVkaXRvckVsXG4gICAqICAgVGhlIHJvb3QgZWxlbWVudCBmb3IgdGhlIGVkaXRvci4gVGhpcyBtdXN0IGhhdmUgdGhlIGNvbnRleHQgaWQgYXR0YWNoZWRcbiAgICogICBhcyBhbiBhdHRyaWJ1dGUgYWNjb3JkaW5nIHRvIHRoZSAnZmllbGQnIHRlbXBsYXRlICc8Y29udGV4dD4nIGRhdGEga2V5IG5hbWUuXG4gICAqICAgQnkgZGVmYXVsdCB0aGlzIGlzICdkYXRhLWNvbnRleHQnLlxuICAgKlxuICAgKiBAcmV0dXJuIHtCaW5kZXJ9XG4gICAqICAgVGhlIG9wZW5lZCB3aWRnZXQgYmluZGVyIGZvciB0aGUgZWRpdG9yLlxuICAgKi9cbiAgb3BlbjogZnVuY3Rpb24oJGVkaXRvckVsKSB7XG4gICAgJGVkaXRvckVsLmFkZENsYXNzKCd3aWRnZXQtYmluZGVyLW9wZW4nKTtcblxuICAgIHZhciBlZGl0b3JDb250ZXh0ID0gdGhpcy5fY3JlYXRlQ29udGV4dFJlc29sdmVyKCkucmVzb2x2ZVRhcmdldENvbnRleHQoJGVkaXRvckVsKTtcbiAgICB2YXIgZWRpdG9yQ29udGV4dElkID0gZWRpdG9yQ29udGV4dCA/IGVkaXRvckNvbnRleHQuZ2V0KCdpZCcpIDogbnVsbDtcbiAgICB2YXIgZWRpdG9yTW9kZWw7XG4gICAgaWYgKGVkaXRvckNvbnRleHRJZCkge1xuICAgICAgaWYgKCF0aGlzLl9lZGl0b3JDb2xsZWN0aW9uLmdldChlZGl0b3JDb250ZXh0SWQpKSB7XG4gICAgICAgIHZhciBjb250ZXh0UmVzb2x2ZXIgPSB0aGlzLl9jcmVhdGVDb250ZXh0UmVzb2x2ZXIoZWRpdG9yQ29udGV4dCk7XG4gICAgICAgIHZhciBjb21tYW5kRW1pdHRlciA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ0NvbW1hbmRFbWl0dGVyJywgdGhpcy5fc3luY0FjdGlvbkRpc3BhdGNoZXIsIGNvbnRleHRSZXNvbHZlcik7XG4gICAgICAgIHZhciBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdFZGl0QnVmZmVySXRlbVJlZkZhY3RvcnknLCBjb250ZXh0UmVzb2x2ZXIsIGNvbW1hbmRFbWl0dGVyKTtcblxuICAgICAgICAvLyBTZXR1cCBhIGNvbnRleHQgbGlzdGVuZXIgZm9yIHJlY2lldmluZyBidWZmZXIgaXRlbSBhcnJpdmFsXG4gICAgICAgIC8vIG5vdGlmaWNhdGlvbnMsIGFuZCBhIGNvbnRleHQgcmVzb2x2ZXIgZm9yIGRldGVybWluaW5nIHdoaWNoXG4gICAgICAgIC8vIGNvbnRleHQocykgYW4gZWxlbWVudCBpcyBhc3NvY2lhdGVkIHdpdGguXG4gICAgICAgIHZhciBjb250ZXh0TGlzdGVuZXIgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdDb250ZXh0TGlzdGVuZXInKTtcbiAgICAgICAgY29udGV4dExpc3RlbmVyLmFkZENvbnRleHQoZWRpdG9yQ29udGV4dCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGZhY3RvcmllcyBmb3IgZ2VuZXJhdGluZyBtb2RlbHMgYW5kIHZpZXdzLlxuICAgICAgICB2YXIgYWRhcHRlciA9IHRoaXMuX2dsb2JhbFNldHRpbmdzLnBsdWdpbnMuYWRhcHRlcjtcbiAgICAgICAgaWYgKHR5cGVvZiBhZGFwdGVyLmNyZWF0ZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgYWRhcHRlciA9IGFkYXB0ZXIuY3JlYXRlLmFwcGx5KGFkYXB0ZXIsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgYSB2aWV3IGZhY3RvcnkgZm9yIGdlbmVyYXRpbmcgd2lkZ2V0IHZpZXdzLlxuICAgICAgICB2YXIgdmlld0ZhY3RvcnkgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdXaWRnZXRWaWV3RmFjdG9yeScsIHRoaXMuX2VsZW1lbnRGYWN0b3J5LCBhZGFwdGVyKTtcbiAgICAgICAgZm9yICh2YXIgdHlwZSBpbiB0aGlzLl9nbG9iYWxTZXR0aW5ncy52aWV3cykge1xuICAgICAgICAgIHZpZXdGYWN0b3J5LnJlZ2lzdGVyKHR5cGUsIHRoaXMuX2dsb2JhbFNldHRpbmdzLnZpZXdzW3R5cGVdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB1dWlkQXR0cmlidXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ3dpZGdldCcpLmdldEF0dHJpYnV0ZU5hbWUoJzx1dWlkPicpO1xuICAgICAgICB2YXIgd2lkZ2V0RmFjdG9yeSA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ1dpZGdldEZhY3RvcnknLCBjb250ZXh0UmVzb2x2ZXIsIGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeSwgdXVpZEF0dHJpYnV0ZSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGEgdGFibGUgZm9yIHN0b3Jpbmcgd2lkZ2V0IGluc3RhbmNlcyBhbmQgYSB0cmFja2VyIHRyYWNrZXIgZm9yXG4gICAgICAgIC8vIG1haW50YWluaW5nIHRoZSB0YWJsZSBiYXNlZCBvbiB0aGUgZWRpdG9yIHN0YXRlLlxuICAgICAgICB2YXIgd2lkZ2V0U3RvcmUgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdXaWRnZXRTdG9yZScsIGFkYXB0ZXIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhIG1lZGlhdG9yIGZvciBjb250cm9sbGluZyBpbnRlcmFjdGlvbnMgYmV0d2VlbiB0aGUgd2lkZ2V0XG4gICAgICAgIC8vIHRhYmxlIGFuZCB0aGUgZWRpdCBidWZmZXIuXG4gICAgICAgIHZhciBlZGl0QnVmZmVyTWVkaWF0b3IgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdFZGl0QnVmZmVyTWVkaWF0b3InLCBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnksIHRoaXMuX2VsZW1lbnRGYWN0b3J5LCBjb250ZXh0TGlzdGVuZXIsIGFkYXB0ZXIsIGNvbnRleHRSZXNvbHZlcik7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBlZGl0b3IgbW9kZWwgYW5kIHJldHVybiBpdCB0byB0aGUgY2FsbGVyLlxuICAgICAgICBlZGl0b3JNb2RlbCA9IG5ldyB0aGlzLl9nbG9iYWxTZXR0aW5ncy5zZXJ2aWNlUHJvdG90eXBlcy5FZGl0b3JDb2xsZWN0aW9uLnByb3RvdHlwZS5tb2RlbCh7XG4gICAgICAgICAgaWQ6IGVkaXRvckNvbnRleHRJZCxcbiAgICAgICAgfSwge1xuICAgICAgICAgIHdpZGdldEZhY3Rvcnk6IHdpZGdldEZhY3RvcnksXG4gICAgICAgICAgdmlld0ZhY3Rvcnk6IHZpZXdGYWN0b3J5LFxuICAgICAgICAgIHdpZGdldFN0b3JlOiB3aWRnZXRTdG9yZSxcbiAgICAgICAgICBlZGl0QnVmZmVyTWVkaWF0b3I6IGVkaXRCdWZmZXJNZWRpYXRvcixcbiAgICAgICAgICBjb250ZXh0OiBlZGl0b3JDb250ZXh0LFxuICAgICAgICAgIGNvbnRleHRSZXNvbHZlcjogY29udGV4dFJlc29sdmVyLFxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGVkaXRvclZpZXcgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdFZGl0b3JWaWV3Jywge1xuICAgICAgICAgIG1vZGVsOiBlZGl0b3JNb2RlbCxcbiAgICAgICAgICBlbDogJGVkaXRvckVsWzBdLFxuICAgICAgICB9LCB7XG4gICAgICAgICAgZWxlbWVudEZhY3Rvcnk6IHRoaXMuX2VsZW1lbnRGYWN0b3J5LFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fZWRpdG9yQ29sbGVjdGlvbi5zZXQoZWRpdG9yTW9kZWwpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdCaW5kZXInLCBlZGl0b3JWaWV3KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4aXN0aW5nIGJpbmRlciBhbHJlYWR5IG9wZW4gZm9yIHRoaXMgZWRpdG9yIGluc3RhbmNlLicpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSGFuZGxlcyB0aGUgaW5pdGlhbGl6YXRpb24gb2Ygb2JqZWN0cyB0aGF0IGxpdmUgYXQgdGhlIGFwcGxpY2F0aW9uIHJvb3QuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdcbiAgICogICBUaGUgY29uZmlnIG9iamVjdCBhcyBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgX2luaXRpYWxpemU6IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHRoaXMuX2dsb2JhbFNldHRpbmdzID0gXy5kZWZhdWx0cyhjb25maWcsIG1vZHVsZS5leHBvcnRzLmRlZmF1bHRzKTtcblxuICAgIHZhciBwcm90b2NvbCA9IHRoaXMuX2dsb2JhbFNldHRpbmdzLnBsdWdpbnMucHJvdG9jb2w7XG4gICAgaWYgKHR5cGVvZiBwcm90b2NvbC5jcmVhdGUgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcHJvdG9jb2wgPSBwcm90b2NvbC5jcmVhdGUuYXBwbHkocHJvdG9jb2wsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIHRoZSBhY3Rpb24gZGlzcGF0Y2hlciAvIHJlc29sdXRpb24gc2VydmljZXMgZm9yIGhhbmRsaW5nIHN5bmNpbmdcbiAgICAvLyBkYXRhIHdpdGggdGhlIHNlcnZlci5cbiAgICB0aGlzLl9zeW5jQWN0aW9uUmVzb2x2ZXIgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdTeW5jQWN0aW9uUmVzb2x2ZXInKTtcbiAgICB0aGlzLl9zeW5jQWN0aW9uRGlzcGF0Y2hlciA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ1N5bmNBY3Rpb25EaXNwYXRjaGVyJywgcHJvdG9jb2wsIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlcik7XG5cbiAgICAvLyBDcmVhdGUgdGhlIHRvcCBsZXZlbCBjb2xsZWN0aW9ucyB0aGF0IGFyZSBzaGFyZWQgYWNyb3NzIGVkaXRvciBpbnN0YW5jZXMuXG4gICAgdmFyIGVkaXRvckNvbGxlY3Rpb24gPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdFZGl0b3JDb2xsZWN0aW9uJyk7XG4gICAgdmFyIGNvbnRleHRDb2xsZWN0aW9uID0gdGhpcy5fY3JlYXRlU2VydmljZSgnQ29udGV4dENvbGxlY3Rpb24nKTtcbiAgICB2YXIgc2NoZW1hQ29sbGVjdGlvbiA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ1NjaGVtYUNvbGxlY3Rpb24nLCBbXSwge1xuICAgICAgY29udGV4dENvbGxlY3Rpb246IGNvbnRleHRDb2xsZWN0aW9uLFxuICAgICAgZGlzcGF0Y2hlcjogdGhpcy5fc3luY0FjdGlvbkRpc3BhdGNoZXIsXG4gICAgfSk7XG4gICAgdGhpcy5fZWRpdG9yQ29sbGVjdGlvbiA9IGVkaXRvckNvbGxlY3Rpb247XG4gICAgdGhpcy5fY29udGV4dENvbGxlY3Rpb24gPSBjb250ZXh0Q29sbGVjdGlvbjtcbiAgICB0aGlzLl9zY2hlbWFDb2xsZWN0aW9uID0gc2NoZW1hQ29sbGVjdGlvbjtcblxuICAgIC8vIFNldCB1cCB0aGUgY29sbGVjdGlvbnMgdGhhdCB0aGUgc3luYyBhY3Rpb24gcmVzb2x2ZXIgc2hvdWxkIHdhdGNoIGZvclxuICAgIC8vIHVwZGF0ZXMgdG8uXG4gICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyLmFkZENvbGxlY3Rpb24oJ2NvbnRleHQnLCB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbik7XG4gICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyLmFkZENvbGxlY3Rpb24oJ3NjaGVtYScsIHRoaXMuX3NjaGVtYUNvbGxlY3Rpb24pO1xuICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5hZGRDb2xsZWN0aW9uKCdlZGl0QnVmZmVySXRlbScsIGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgICAgIHJldHVybiBjb250ZXh0Q29sbGVjdGlvbi5nZXQoYXR0cmlidXRlcy5jb250ZXh0SWQpLmVkaXRCdWZmZXI7XG4gICAgfSk7XG4gICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyLmFkZENvbGxlY3Rpb24oJ3dpZGdldCcsIGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgICAgIHZhciB3aWRnZXRTdG9yZSA9IGVkaXRvckNvbGxlY3Rpb24uZ2V0KGF0dHJpYnV0ZXMuZWRpdG9yQ29udGV4dElkKS53aWRnZXRTdG9yZTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICByZXR1cm4gd2lkZ2V0U3RvcmUuZ2V0KGlkKS5tb2RlbDtcbiAgICAgICAgfSxcbiAgICAgICAgYWRkOiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgcmV0dXJuIHdpZGdldFN0b3JlLmFkZChhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBhbiBlbGVtZW50IGZhY3RvcnkgdG8gcHJvdmlkZSBhIGdlbmVyaWMgd2F5IHRvIGNyZWF0ZSBtYXJrdXAuXG4gICAgdGhpcy5fZWxlbWVudEZhY3RvcnkgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdFbGVtZW50RmFjdG9yeScsIHRoaXMuX2dsb2JhbFNldHRpbmdzLmVsZW1lbnRzKTtcblxuICAgIC8vIExvYWQgYW55IGluaXRpYWwgbW9kZWxzLlxuICAgIGlmIChjb25maWcuZGF0YSkge1xuICAgICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyLnJlc29sdmUoY29uZmlnLmRhdGEpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBhIGNvbnRleHQgcmVzb2x2ZXIgZm9yIGEgZ2l2ZW4gZWRpdG9yIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbnRleHR9IGVkaXRvckNvbnRleHRcbiAgICogICBUaGUgcm9vdCBjb250ZXh0IG9mIHRoZSBlZGl0b3IuXG4gICAqXG4gICAqIEByZXR1cm4ge0NvbnRleHRSZXNvbHZlcn1cbiAgICogICBBIGNvbnRleHQgcmVzb2x2ZXIgc3BlY2lmaWMgdG8gdGhlIHByb3ZpZGVkIGVkaXRvciBjb250ZXh0LlxuICAgKi9cbiAgX2NyZWF0ZUNvbnRleHRSZXNvbHZlcjogZnVuY3Rpb24oZWRpdG9yQ29udGV4dCkge1xuICAgIHZhciBzb3VyY2VDb250ZXh0QXR0cmlidXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ3dpZGdldCcpLmdldEF0dHJpYnV0ZU5hbWUoJzxjb250ZXh0PicpO1xuICAgIHZhciB0YXJnZXRDb250ZXh0QXR0cmlidXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ2ZpZWxkJykuZ2V0QXR0cmlidXRlTmFtZSgnPGNvbnRleHQ+Jyk7XG4gICAgcmV0dXJuIHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ0NvbnRleHRSZXNvbHZlcicsIHRoaXMuX2NvbnRleHRDb2xsZWN0aW9uLCBzb3VyY2VDb250ZXh0QXR0cmlidXRlLCB0YXJnZXRDb250ZXh0QXR0cmlidXRlLCBlZGl0b3JDb250ZXh0KTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNlcnZpY2UgYmFzZWQgb24gdGhlIGNvbmZpZ3VyZWQgcHJvdG90eXBlLlxuICAgKlxuICAgKiBTZXJ2aWNlIG5hbWVzIGFyZSB0aGUgc2FtZSBhcyBjbGFzcyBuYW1lcy4gV2Ugb25seSBzdXBwb3J0IHNlcnZpY2VzIHdpdGggdXBcbiAgICogdG8gZml2ZSBhcmd1bWVudHNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogICBUaGUgbmFtZSBvZiB0aGUgc2VydmljZSB0byBiZSBjcmVhdGVkLiBUaGlzIGlzIHRoZSBkZWZhdWx0IGNsYXNzIG5hbWUuXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICogICBUaGUgY3JlYXRlZCBzZXJ2aWNlLiBOb3RlIHRoYXQgYSBuZXcgc2VydmljZSB3aWxsIGJlIGNyZWF0ZWQgZWFjaCB0aW1lXG4gICAqICAgdGhpcyBtZXRob2QgaXMgY2FsbGVkLiBObyBzdGF0aWMgY2FjaGluZyBpcyBwZXJmb3JtZWQuXG4gICAqL1xuICBfY3JlYXRlU2VydmljZTogZnVuY3Rpb24obmFtZSkge1xuICAgIC8vIEFsbCBhcmd1bWVudHMgdGhhdCBmb2xsb3cgdGhlICduYW1lJyBhcmd1bWVudCBhcmUgaW5qZWN0ZWQgYXNcbiAgICAvLyBkZXBlbmRlbmNpZXMgaW50byB0aGUgY3JlYXRlZCBvYmplY3QuXG4gICAgdmFyIGFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgfVxuXG4gICAgLy8gV2UgZXhwbGljaXRseSBjYWxsIHRoZSBjb25zdHJ1Y3RvciBoZXJlIGluc3RlYWQgb2YgZG9pbmcgc29tZSBmYW5jeSBtYWdpY1xuICAgIC8vIHdpdGggd3JhcHBlciBjbGFzc2VzIGluIG9yZGVyIHRvIGluc3VyZSB0aGF0IHRoZSBjcmVhdGVkIG9iamVjdCBpc1xuICAgIC8vIGFjdHVhbGx5IGFuIGluc3RhbmNlb2YgdGhlIHByb3RvdHlwZS5cbiAgICB2YXIgcHJvdG90eXBlID0gdGhpcy5fZ2xvYmFsU2V0dGluZ3Muc2VydmljZVByb3RvdHlwZXNbbmFtZV07XG4gICAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICByZXR1cm4gbmV3IHByb3RvdHlwZSgpO1xuICAgICAgY2FzZSAxOlxuICAgICAgICByZXR1cm4gbmV3IHByb3RvdHlwZShhcmdzWzBdKTtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIG5ldyBwcm90b3R5cGUoYXJnc1swXSwgYXJnc1sxXSk7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHJldHVybiBuZXcgcHJvdG90eXBlKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0pO1xuICAgICAgY2FzZSA0OlxuICAgICAgICByZXR1cm4gbmV3IHByb3RvdHlwZShhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdLCBhcmdzWzNdKTtcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgcmV0dXJuIG5ldyBwcm90b3R5cGUoYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSwgYXJnc1s0XSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlYWxseSwgeW91IG5lZWQgdG8gaW5qZWN0IG1vcmUgdGhhbiBmaXZlIHNlcnZpY2VzPyBDb25zaWRlciBmYWN0b3JpbmcgJyArIG5hbWUgKyAnIGludG8gc2VwYXJhdGUgY2xhc3Nlcy4nKTtcbiAgICB9XG4gIH1cblxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogTWFya3MgYSBtZXRob2QgYXMgYW4gaW50ZXJmYWNlIHN0dWIuXG4gKlxuICogQHJldHVybiB7dm9pZH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdVbmltcGxlbWVudGVkIG1ldGhvZC4nKTtcbn07XG4iXX0=
