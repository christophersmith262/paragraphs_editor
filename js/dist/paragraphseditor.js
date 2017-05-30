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

  send: function(type, data, settings, resolver) {
    if (type == 'FETCH_SCHEMA') {
      this._get(data, resolver);
    }
    else {
      this._sendAjaxCommand(data, settings, resolver);
    }
  },

  _sendAjaxCommand: function(command, settings, resolver) {

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
    for (var key in settings) {
      params.push('settings[' + key + ']=' + settings[key]);
    }
    params.push('module=' + this.moduleName);
    path += '?' + params.join('&');

    var ajax = Drupal.ajax({
      url: path,
      progress: {
        message: "",
      },
    });

    ajax.options.data['editorContext'] = command.editorContext.get('id');
    delete command.editorContext;

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

},{"widget-binder":36}],3:[function(require,module,exports){
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

},{"./BundleSelector":1,"./WidgetBindingProtocol":2,"widget-binder":36}],4:[function(require,module,exports){
var _ = window._             ,
  $ = window.jQuery    ,
  WidgetModel = require('./Models/WidgetModel');

module.exports = function(editorView) {
  this._editorView = editorView;
  this._widgetFactory = editorView.model.widgetFactory;
  this._viewFactory = editorView.model.viewFactory;
  this._widgetStore = editorView.model.widgetStore;
  this._editBufferMediator = editorView.model.editBufferMediator;
  this._contextResolver = editorView.model.contextResolver;
}

_.extend(module.exports.prototype, {

  /**
   * Requests that a new widget be inserted.
   *
   * @param {jQuery} $targetEl
   *   The element that the new widget will be inserted into.
   * @param {string} type
   *   The type of the item to request. This parameter is optional.
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
  },

  /**
   */
  unbind: function(id) {
    this._applyToModel(id, function(widgetModel) {
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
  get: function(id, options) {
    return this._widgetStore.get(id, { raw: true }).model;
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
   */
  edit: function(id) {
    this._applyToModel(id, function(widgetModel) {
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
   *   The saved model.
   */
  save: function(id, $targetEl) {
    return this._applyToModel(id, function(widgetModel) {
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
   */
  close: function() {
    this._editorView.model.destroy();
    this._editorView.stopListening();
    this._widgetStore.cleanup();
    this._editBufferMediator.cleanup();
  },

  /**
   */
  getSettings: function() {
    return this._contextResolver.getEditorContext().getSettings();
  },

  /**
   */
  getSetting: function(name) {
    return this._contextResolver.getEditorContext().getSetting(name);
  },

  /**
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
 */
module.exports = Backbone.Collection.extend({

  model: ContextModel,

  /**
   */
  get: function(contextString, settings, skipLazyLoad) {
    if (typeof contextString == 'string' && !skipLazyLoad) {
      if (!Backbone.Collection.prototype.get.call(this, contextString)) {
        if (!settings) {
          settings = {};
        }
        var model = new ContextModel({ id: contextString, settings: settings });
        this.add(model);
      }
    }
    return Backbone.Collection.prototype.get.call(this, contextString);
  },

  /**
   */
  touch: function(contextString) {
    this.get(contextString);
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
 */
module.exports = Backbone.Collection.extend({

  model: EditBufferItemModel,

  /**
   */
  initialize: function(models, options) {
    this._contextId = options.contextId;
  },

  /**
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
   */
  setItem: function(itemModel) {
    return this.add(itemModel, {merge: true});
  },

  /**
   */
  removeItem: function(uuid) {
    this.remove(uuid);
  },

  /**
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
 */
module.exports = Backbone.Collection.extend({

  model: SchemaModel,

  /**
   */
  initialize: function(models, options) {
    this.listenTo(options.contextCollection, 'add', this.addContextSchema);
    this._dispatcher = options.dispatcher;
  },

  /**
   */
  isAllowed: function(schemaId, type) {
    var model = this.get(schemaId);
    return !!(model && model.get('allowed')[type]);
  },

  /**
   */
  addContextSchema: function(contextModel) {
    this._fetchSchema(contextModel);
    this.listenTo(contextModel, 'change:schemaId', this._fetchSchema);
  },

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
 */
module.exports = function() {
};

_.extend(module.exports.prototype, Backbone.Events, {

  /**
   * Add a context to the listener.
   *
   * @param {Context} context
   *   The context to listen to.
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
 */
module.exports = function(contextCollection, sourceContextAttribute, targetContextAttribute, editorContext) {
  this._contextCollection = contextCollection;
  this._sourceContextAttribute = sourceContextAttribute;
  this._targetContextAttribute = targetContextAttribute;
  this._editorContext = editorContext;
};

_.extend(module.exports.prototype, {

  /**
   */
  resolveTargetContext: function ($el) {
    var contextId = $el.attr(this._targetContextAttribute);
    if (!contextId) {
      contextId = $el.closest('[' + this._targetContextAttribute + ']').attr(this._targetContextAttribute);
    }

    return this.get(contextId);
  },

  /**
   */
  resolveSourceContext: function($el) {
    var contextId = $el.attr(this._sourceContextAttribute);
    return contextId ? this.get(contextId) : this._editorContext;
  },

  /**
   */
  getEditorContext: function() {
    return this._editorContext;
  },

  /**
   */
  get: function(contextId) {
    if (contextId) {
      var settings = this._editorContext ? this._editorContext.getSettings() : {};
      return this._contextCollection.get(contextId, settings);
    }
    else {
      return this._editorContext;
    }
  },

  /**
   */
  touch: function(contextId) {
    return this._contextCollection.touch(contextId);
  },

});

},{}],12:[function(require,module,exports){
/**
 * @file
 * Provides an actionable reference to a edit buffer item.
 */

'use strict';

var _ = window._             ;

module.exports = function(bufferItemModel, sourceContext, targetContext, commandEmitter) {
  this.editBufferItem = bufferItemModel; 
  this.sourceContext = sourceContext; 
  this.targetContext = targetContext; 
  this._commandEmitter = commandEmitter; 
};

_.extend(module.exports.prototype, {

  edit: function(edits) {
    this._commandEmitter.edit(this.targetContext.get('id'), this.editBufferItem.get('id'), edits);
  },

  render: function(edits) {
    this._commandEmitter.render(this.targetContext.get('id'), this.editBufferItem.get('id'), edits);
  },

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
   */
  requestBufferItem: function(schemaId, $el) {
    var targetContext = this._contextResolver.resolveTargetContext($el);
    this._contextListener.addContext(targetContext);
    this._editBufferItemRefFactory.requestNewItem(targetContext.get('id'), schemaId);
      
  },

  cleanup: function() {
    this._contextListener.cleanup();
    this.stopListening();
  },

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
 * @param {EditorContext} editorContext
 *   The editor context to use to get sync settings from.
 */
module.exports = function(dispatcher, editorContext) {
  this._dispatcher = dispatcher;
  this._editorContext = editorContext;
};

_.extend(module.exports.prototype, {

  /**
   * Executes an "insert" command.
   *
   * @param {string} targetContextId
   *   The id of the context the new item will be inserted into.
   * @param {string} type
   *   The type to insert. This is optional.
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
   */
  _execute: function(type, command) {
    command.editorContext = this._editorContext;
    this._dispatcher.dispatch(type, command, this._editorContext.getSettings());
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
  },

  /**
   * Gets a widget model, view pair based on its widget id.
   *
   * @param {mixed} id
   *   The id of the widget to get.
   *
   * @return {object}
   *   An object with keys 'model' and 'view', which are respectively the model
   *   and view objects associated with the widget id. If either cannot be
   *   found, the value in the respective key is null.
   */
  get: function(id, options) {
    if (!options) {
      options = {};
    }

    var widgetModel = this._widgetCollection.get(id);
    if (widgetModel && !options.raw) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');
      return {
        model: widgetModel,
        view: this._readCell(i, j),
      };
    }

    return {
      model: widgetModel,
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
    this.stopListening();
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
   */
  getTag: function() {
    return this._tag;
  },

  /**
   */
  getAttributes: function() {
    return this._attributes;
  },

  /**
   */
  getAttributeNames: function() {
    return _.keys(this._attributeMap);
  },

  /**
   */
  setAttribute: function(name, value) {
    this._attributes[this.getAttributeName(name)] = value;
    return this;
  },

  /**
   */
  getAttribute: function(name) {
    return this._attributes[this.getAttributeName(name)];
  },

  /**
   */
  getAttributeName: function(name) {
    var dataKey = this._getDataKey(name);
    if (dataKey && this._invertedAttributeMap[dataKey]) {
      name = this._invertedAttributeMap[dataKey];
    }
    return name;
  },

  /**
   */
  renderOpeningTag: function() {
    var result = '<' + this.getTag();

    _.each(this.getAttributes(), function(value, name) {
      result += ' ' + name + '="' + value + '"';
    });

    return result + '>';
  },

  /**
   */
  renderClosingTag: function() {
    return '</' + this.getTag() + '>';
  },

  /**
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
 */
module.exports = Backbone.Model.extend({

  type: 'Context',

  defaults: {
    schemaId: '',
    settings: {},
  },

  /**
   * {@inheritdoc}
   */
  constructor: function(attributes, options) {
    this.editBuffer = new EditBufferItemCollection([], { contextId: attributes.id });
    Backbone.Model.apply(this, [attributes, options]);
  },

  /**
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
   */
  getSettings: function() {
    return this.get('settings');
  },

  /**
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
   * {@inheritdoc}
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
   */
  _updateContextId: function(contextModel) {
    this.set({ id: contextModel.get('id') });
  },

  destroy: function() {
    this.stopListening();
    this.widgetStore.cleanup();
    this.editBufferMediator.cleanup();
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
   * {@inheritdoc}
   */
  constructor: function (attributes, options) {
    this.widget = options.widget;
    this._editBufferItemRefFactory = options.editBufferItemRefFactory;
    this._contextResolver = options.contextResolver;
    Backbone.Model.apply(this, [attributes, options]);
  },

  /**
   * {@inheritdoc}
   */
  set: function(attributes, options) {
    this._filterAttributes(attributes);
    return Backbone.Model.prototype.set.call(this, attributes, options);
  },

  /**
   * Triggers a request to edit the referenced edit buffer item.
   */
  edit: function() {
    this.editBufferItemRef.edit(this.get('edits'));
    return this;
  },

  /**
   * Triggers a request to duplicate the referenced edit buffer item.
   */
  duplicate: function() {
    this.set({ duplicating: true });
    this.editBufferItemRef.duplicate(this.get('id'), this.get('edits'));
    return this;
  },

  /**
   * Triggers a chain of events to delete / clean up after this widget.
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
  },

  /**
   * Updates the destruction state for this widget.
   */
  setState: function(state) {
    return this.set({state: this.get('state') | state});
  },

  /**
   * Checks the destruction state for this widget.
   */
  hasState: function(state) {
    return (this.get('state') & state) === state;
  },

  /**
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
  },

  /**
   * Internal function to copy updates from the referenced buffer item.
   */
  _readFromBufferItem: function(bufferItemModel) {
    this.set({markup: bufferItemModel.get('markup')});
  },

  /**
   * Internal function to handle when a referenced context id has changed.
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
  Backbone = window.Backbone    ;

/**
 * Marks a method as an interface stub.
 */
function unimplemented() {
  throw new Error('Unimplemented method.');
}

/**
 */
module.exports = function() {
};

_.extend(module.exports.prototype, {

  /**
   * Inserts an embed code into the editor.
   *
   * This should insert the newly created element at the current editable cursor
   * position within the editor.
   *
   * @param {Element} embedCode
   *   The embed code element to be inserted.
   */
  insertEmbedCode: function(embedCode) {
    unimplemented();
  },

  /**
   * Removes a widget from the editor.
   *
   * This should remove the widget based on its unique id and free any
   * associated memory.
   *
   * @param {int} id
   *   The id of the widget to be destroyed.
   */
  destroyWidget: function(id) {
    unimplemented();
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
   */
  attachInlineEditing: function(widgetView, contextId, selector) {
    unimplemented();
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
    return unimplemented();
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
   */
  cleanup: function() {
  }

});

module.exports.extend = Backbone.Model.extend;

},{}],27:[function(require,module,exports){
/**
 * @file
 * Provides an interface for protocol plugins.
 */

'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ;

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
   * @param {object} settings
   *   Non-command specific context settings.
   * @param {SyncActionResolver} resolver
   *   The resolver service that will be used to resolve the command.
   */
  send: function(type, data, settings, resolver) {
    throw new Error('Unimplemented method.');
  }

});

module.exports.extend = Backbone.Model.extend;

},{}],28:[function(require,module,exports){

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
   * @param {object} settings
   *   Context-specific settings to be sent with the request.
   */
  dispatch: function(type, data, settings) {
    this._protocol.send(type, data, settings, this._resolver);
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
   */
  resolve: function(response) {
    _.each(response, function(models, modelName) {
      if (this._collections[modelName]) {
        this._updateModels(models, this._collections[modelName]);
      }
    }, this);
  },

  /**
   * Adds models to a collection.
   *
   * @param {object} models
   *   An object where keys are model ids and values are model attributes.
   * @param {mixed} collection
   *   Can either be a Backbone.Collection to add the model to, or a callback
   *   which returns the collection.
   */
  _updateModels: function(models, collection) {
    var resolvedCollection = collection;
    _.each(models, function(attributes, id) {

      // If a function is passed as the collection, we call it to resolve the
      // actual collection for this model.
      if (typeof collection == 'function') {
        resolvedCollection = collection(attributes);
      }

      // We first try to load the existing model instead of directly setting the
      // model in collection since it is completely valid for a model's id to
      // change.
      var existing = resolvedCollection.get(id);
      if (existing) {
        existing.set(attributes);
      }
      else {
        if (!attributes.id) {
          attributes.id = id;
        }
        resolvedCollection.add(attributes);
      }
    });
  }

});

},{}],30:[function(require,module,exports){

'use strict';

var _ = window._             ;

/**
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

var _ = window._             ,
  Backbone = window.Backbone    ;

/**
 */
module.exports = Backbone.View.extend({

  /**
   * {@inheritdoc}
   */
  initialize: function(attributes, options) {
    this._elementFactory = options.elementFactory;

    this.listenTo(this.model, 'change:id', this.render);
    this.listenTo(this.model, 'destroy', this.stopListening);
    this.render();
  },

  /**
   */
  render: function() {
    var template = this._elementFactory.getTemplate('field');
    this.$el.attr(template.getAttributeName('<context>'), this.model.get('context'));
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
  $ = Backbone.$;

/**
 * Backbone view for representing widgets within the editor.
 *
 * @constructor
 *
 * @augments Backbone.Model
 */
module.exports = Backbone.View.extend({

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
   * {@inheritdoc}
   */
  initialize: function(options) {
    this.adapter = options.adapter;
    this._elementFactory = options.elementFactory;
    this.template = options.template;

    // Get a list of templates that will be used.
    var widgetTemplate = this._elementFactory.getTemplate('widget');
    var fieldTemplate = this._elementFactory.getTemplate('field');
    var widgetCommandTemplate = this._elementFactory.getTemplate('widget-command');

    // Set up attribute / element selectors.
    this.widgetSelector = widgetTemplate.getSelector();
    this.viewModeAttribute = widgetTemplate.getAttributeName('<viewmode>');
    this.inlineContextAttribute = fieldTemplate.getAttributeName('<context>');
    this.commandSelector = widgetCommandTemplate.getSelector();
    this.commandAttribute = widgetCommandTemplate.getAttributeName('<command>');
    this.inlineEditorSelector = fieldTemplate.getSelector();

    this._state = {};

    // Set up the change handler.
    this.listenTo(this.model, 'change', this._changeHandler);
    this.listenTo(this.model, 'rebase', this._rebase);
    this._rebased = {};
  },

  /**
   */
  template: function(elementFactory, markup, actions) {
  },

  /**
   */
  render: function(preserveDomEdits) {
    if (this.model.get('duplicating')) {
      this.$el.html(this.template(this._elementFactory, '...', this.actions));
    }
    else {
      if (preserveDomEdits) {
        var domEdits = {};
        this._inlineElementVisitor(function($el, contextString, selector) {
          domEdits[contextString] = $el.children();
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
          this.adapter.attachInlineEditing(this, contextString, selector);

          if (domEdits[contextString]) {
            $el.html('').append(domEdits[contextString]);
          }
        }, $newContainer);

        this.$el.append($newContainer.children());
        $oldContainer.remove();
        $newContainer.remove();
      }
      else {
        this.$el.html(this.template(this._elementFactory, this.model.get('markup'), this.actions));

        this._rebase();
        var edits = this.model.get('edits');
        this._inlineElementVisitor(function($el, contextString, selector) {
          if (edits[contextString]) {
            $el.html(edits[contextString] ? edits[contextString] : '');
          }

          this.adapter.attachInlineEditing(this, contextString, selector);
        });
      }

      _.each(this._rebased, function(unused, contextString) {
        var selector = '[' + this.inlineContextAttribute + '="' + contextString + '"]';
        this.adapter.detachInlineEditing(this, contextString, selector);
      }, this);
      this._rebased = {};

      var view = this;
      this._find(this.commandSelector).on('click', function() {
        var action = $(this).attr(view.commandAttribute);
        view.actions[action].callback.call(view);
      });
      this.renderAttributes();
    }

    return this;
  },

  /**
   */
  renderAttributes: function() {
    var element = this._elementFactory.create('widget', {
      context: this.model.get('contextId'),
      uuid: this.model.get('itemId'),
      viewmode: 'editor',
    });

    _.each(element.getAttributes(), function(value, name) {
      this.$el.attr(name, value);
    }, this);

    return this;
  },

  /**
   */
  save: function() {

    if (!this.model.get('duplicating')) {
      var edits = {};
      this._inlineElementVisitor(function($el, contextString, selector) {
        edits[contextString] = this.adapter.getInlineEdit(this, contextString, selector);
      });
      this.model.set({edits: edits}, {silent: true});
    }

    return this;
  },

  /**
   */
  _rebase: function(model, oldId, newId) {
    if (!model) {
      model = this.model;
    }

    if (oldId && newId) {
      this._inlineElementVisitor(function($el, contextString, selector) {
        if (contextString == oldId) {
          $el.attr(this.inlineContextAttribute, newId);
        }
      });
      this._rebased[oldId] = true;
    }
    else {
      var oldEdits = _.toArray(this.model.get('edits'));
      var edits = {};
      this._inlineElementVisitor(function($el, contextString, selector) {
        var oldEdit = oldEdits.pop();
        edits[contextString] = oldEdit ? oldEdit : '';
      });
      this.model.set({ edits: edits }, { silent: true });
    }
    return this;
  },

  /**
   */
  edit: function() {
    this.model.edit();
  },

  /**
   */
  remove: function() {
    this.stopListening();
    if (this.model) {
      var model = this.model;
      this.model = null;
      model.destroy();
    }
    return this;
  },

  /**
   */
  stopListening: function() {
    this._find(this.commandSelector).off();
    return Backbone.View.prototype.stopListening.call(this);
  },

  /**
   */
  isEditorViewRendered: function() {
    return this.$el.attr(this.viewModeAttribute) == 'editor';
  },

  /**
   */
  _changeHandler: function() {
    var markupChanged = this.model.hasChanged('markup');
    if (this.model.get('duplicating') || this.model.previous('duplicating')) {
      this.render();
    }

    else if (this.model.hasChanged('markup')) {
      this.render(true);
    }

    else if (this.model.hasChanged('itemId') || this.model.hasChanged('contextId')) {
      this.renderAttributes();
    }

    return this;
  },

  /**
   */
  _inlineElementVisitor: function(callback, $rootEl) {
    if (!$rootEl) {
      $rootEl = this.$el;
    }
    var view = this;
    this._find(this.inlineEditorSelector, $rootEl).each(function() {
      if ($(this).closest(view.widgetSelector).is(view.$el)) {
        var contextString = $(this).attr(view.inlineContextAttribute);
        var selector = '[' + view.inlineContextAttribute + '="' + contextString + '"]';
        callback.call(view, $(this), contextString, selector);
      }
    });
  },

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

},{}],34:[function(require,module,exports){
/**
 * @file
 * A Backbone view for representing the exported data state of a widget.
 */

'use strict';

var _ = window._             ,
  Backbone = window.Backbone    ,
  $ = Backbone.$;

module.exports = Backbone.View.extend({

  /**
   * @inheritdoc
   */
  initialize: function(options) {
    this.adapter = options.adapter;
    this.elementFactory = options.elementFactory;
    this.template = options.template;

    // Get a list of templates that will be used.
    var widgetTemplate = this.elementFactory.getTemplate('widget');
    var fieldTemplate = this.elementFactory.getTemplate('field');

    // Set up attribute / element selectors.
    this.widgetSelector = widgetTemplate.getSelector();
    this.inlineContextAttribute = fieldTemplate.getAttributeName('<context>');
    this.inlineEditorSelector = fieldTemplate.getSelector();

    // Filter out non-configured attributes.
    this.attributeWhitelist = _.invert(widgetTemplate.getAttributeNames());
    delete this.attributeWhitelist[widgetTemplate.getAttributeName('<viewmode>')];
  },

  /**
   */
  template: function(elementFactory, fields, edits) {
  },

  /**
   */
  render: function() {
    var view = this;
    var fields = this.model.editBufferItemRef.editBufferItem.get('fields');
    var edits = this.model.get('edits');
    this.$el.html(this.template(this.elementFactory, fields, edits));
    _.each(this.el.attributes, function(attr) {
      if (_.isUndefined(view.attributeWhitelist[attr.name])) {
        view.$el.removeAttr(attr.name);
      }
    });
    return this;
  },

  /**
   */
  save: function() {
    var edits = {};
    var view = this;
    this.$el.find(this.inlineEditorSelector).each(function() {
      if ($(this).closest(view.widgetSelector).is(view.$el)) {
        var contextString = $(this).attr(view.inlineContextAttribute);
        edits[contextString] = $(this).html();
      }
    });
    this.model.set({edits: edits}, {silent: true});
    return this;
  },

  /**
   */
  remove: function() {
  }

});

},{}],35:[function(require,module,exports){

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

},{"./Binder":4,"./Collections/ContextCollection":5,"./Collections/EditorCollection":7,"./Collections/SchemaCollection":8,"./Context/ContextListener":10,"./Context/ContextResolver":11,"./EditBuffer/EditBufferItemRefFactory":13,"./EditBuffer/EditBufferMediator":14,"./Editor/Command/CommandEmitter":15,"./Editor/Widget/WidgetFactory":16,"./Editor/Widget/WidgetStore":17,"./Editor/Widget/WidgetViewFactory":18,"./Element/ElementFactory":20,"./SyncAction/SyncActionDispatcher":28,"./SyncAction/SyncActionResolver":29,"./Templates/WidgetEditorViewTemplate":30,"./Templates/WidgetMementoViewTemplate":31,"./Views/EditorView":32,"./Views/WidgetEditorView":33,"./Views/WidgetMementoView":34}],36:[function(require,module,exports){
/**
 * @file
 * A package for managing server / client data binding for editor widgets. 
 */

'use strict';

var _ = window._             ,
    $ = window.jQuery    ;

/**
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
   */
  getInstanceName: function() {
    return this._globalSettings.name;
  },

  /**
   */
  getElementFactory: function() {
    return this._elementFactory;
  },

  /**
   */
  getContexts: function() {
    return this._contextCollection;
  },

  /**
   */
  getSchema: function() {
    return this._schemaCollection;
  },

  /**
   */
  getEditors: function() {
    return this._editorCollection;
  },

  /**
   */
  getSyncActionDispatcher: function() {
    return this._syncActionDispatcher;
  },

  /**
   */
  getSyncActionResolver: function() {
    return this._syncActionResolver;
  },

  /**
   */
  open: function($editorEl) {
    $editorEl.addClass('widget-binder-open');

    var editorContext = this._createContextResolver().resolveTargetContext($editorEl);
    var editorContextId = editorContext ? editorContext.get('id') : null;
    var editorModel;
    if (editorContextId) {
      if (!this._editorCollection.get(editorContextId)) {
        var contextResolver = this._createContextResolver(editorContext);
        var commandEmitter = this._createService('CommandEmitter', this._syncActionDispatcher, editorContext);
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

},{"./Plugins/EditorAdapter":26,"./Plugins/SyncProtocol":27,"./config":35}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9qcy9zcmMvQnVuZGxlU2VsZWN0b3IuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9qcy9zcmMvV2lkZ2V0QmluZGluZ1Byb3RvY29sLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3IvanMvc3JjL2Zha2VfOTM5NjFmNjcuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9CaW5kZXIuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Db2xsZWN0aW9ucy9Db250ZXh0Q29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbGxlY3Rpb25zL0VkaXRCdWZmZXJJdGVtQ29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbGxlY3Rpb25zL0VkaXRvckNvbGxlY3Rpb24uanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Db2xsZWN0aW9ucy9TY2hlbWFDb2xsZWN0aW9uLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvQ29sbGVjdGlvbnMvV2lkZ2V0Q29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbnRleHQvQ29udGV4dExpc3RlbmVyLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvQ29udGV4dC9Db250ZXh0UmVzb2x2ZXIuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FZGl0QnVmZmVyL0VkaXRCdWZmZXJJdGVtUmVmLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdEJ1ZmZlci9FZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FZGl0QnVmZmVyL0VkaXRCdWZmZXJNZWRpYXRvci5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VkaXRvci9Db21tYW5kL0NvbW1hbmRFbWl0dGVyLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdG9yL1dpZGdldC9XaWRnZXRGYWN0b3J5LmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdG9yL1dpZGdldC9XaWRnZXRTdG9yZS5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VkaXRvci9XaWRnZXQvV2lkZ2V0Vmlld0ZhY3RvcnkuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FbGVtZW50L0VsZW1lbnQuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FbGVtZW50L0VsZW1lbnRGYWN0b3J5LmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL0NvbnRleHRNb2RlbC5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL01vZGVscy9FZGl0QnVmZmVySXRlbU1vZGVsLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL0VkaXRvck1vZGVsLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL1NjaGVtYU1vZGVsLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL1dpZGdldE1vZGVsLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvUGx1Z2lucy9FZGl0b3JBZGFwdGVyLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvUGx1Z2lucy9TeW5jUHJvdG9jb2wuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9TeW5jQWN0aW9uL1N5bmNBY3Rpb25EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvU3luY0FjdGlvbi9TeW5jQWN0aW9uUmVzb2x2ZXIuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9UZW1wbGF0ZXMvV2lkZ2V0RWRpdG9yVmlld1RlbXBsYXRlLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvVGVtcGxhdGVzL1dpZGdldE1lbWVudG9WaWV3VGVtcGxhdGUuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9WaWV3cy9FZGl0b3JWaWV3LmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvVmlld3MvV2lkZ2V0RWRpdG9yVmlldy5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL1ZpZXdzL1dpZGdldE1lbWVudG9WaWV3LmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvY29uZmlnLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgRHJ1cGFsIEFQSSBpbnRlZ3JhdGlvbnMgZm9yIHBhcmFncmFwaHNfZWRpdG9yLlxuICovXG5cbnZhciBEcnVwYWwgPSByZXF1aXJlKCdkcnVwYWwnKSxcbiAgJCA9IHJlcXVpcmUoJ2pxdWVyeScpO1xuXG5EcnVwYWwuYmVoYXZpb3JzLnBhcmFncmFwaHNfZWRpdG9yX2J1bmRsZXNlbGVjdG9yID0ge1xuICBhdHRhY2g6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAkKCcucGFyYWdyYXBocy1lZGl0b3ItYnVuZGxlLXNlbGVjdG9yLXNlYXJjaCcsIGNvbnRleHQpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGNvbnRhaW5lciA9ICQodGhpcyk7XG4gICAgICB2YXIgJGlucHV0ID0gJGNvbnRhaW5lci5maW5kKCcucGFyYWdyYXBocy1lZGl0b3ItYnVuZGxlLXNlbGVjdG9yLXNlYXJjaF9faW5wdXQnKTtcbiAgICAgIHZhciAkc3VibWl0ID0gJGNvbnRhaW5lci5maW5kKCcucGFyYWdyYXBocy1lZGl0b3ItYnVuZGxlLXNlbGVjdG9yLXNlYXJjaF9fc3VibWl0Jyk7XG5cbiAgICAgICRpbnB1dC5rZXl1cChmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICRzdWJtaXQubW91c2Vkb3duKCk7XG4gICAgICB9KS5ibHVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdmb2N1cycpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsInZhciBEcnVwYWwgPSByZXF1aXJlKCdkcnVwYWwnKSxcbiAgJCA9IHJlcXVpcmUoJ2pxdWVyeScpLFxuICBXaWRnZXRCaW5kZXIgPSByZXF1aXJlKCd3aWRnZXQtYmluZGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gV2lkZ2V0QmluZGVyLlBsdWdpbkludGVyZmFjZS5TeW5jUHJvdG9jb2wuZXh0ZW5kKHtcblxuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24obW9kdWxlX25hbWUpIHtcbiAgICB0aGlzLm1vZHVsZU5hbWUgPSBtb2R1bGVfbmFtZTtcbiAgfSxcblxuICBzZW5kOiBmdW5jdGlvbih0eXBlLCBkYXRhLCBzZXR0aW5ncywgcmVzb2x2ZXIpIHtcbiAgICBpZiAodHlwZSA9PSAnRkVUQ0hfU0NIRU1BJykge1xuICAgICAgdGhpcy5fZ2V0KGRhdGEsIHJlc29sdmVyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9zZW5kQWpheENvbW1hbmQoZGF0YSwgc2V0dGluZ3MsIHJlc29sdmVyKTtcbiAgICB9XG4gIH0sXG5cbiAgX3NlbmRBamF4Q29tbWFuZDogZnVuY3Rpb24oY29tbWFuZCwgc2V0dGluZ3MsIHJlc29sdmVyKSB7XG5cbiAgICBpZiAoIWNvbW1hbmQuY29tbWFuZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9ICcvYWpheC9wYXJhZ3JhcGhzLWVkaXRvci8nICsgY29tbWFuZC5jb21tYW5kO1xuXG4gICAgaWYgKGNvbW1hbmQudGFyZ2V0Q29udGV4dCkge1xuICAgICAgcGF0aCArPSAnLycgKyBjb21tYW5kLnRhcmdldENvbnRleHQ7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1hbmQuc291cmNlQ29udGV4dCkge1xuICAgICAgcGF0aCArPSAnLycgKyBjb21tYW5kLnNvdXJjZUNvbnRleHQ7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1hbmQuaXRlbUlkKSB7XG4gICAgICBwYXRoICs9ICcvJyArIGNvbW1hbmQuaXRlbUlkO1xuICAgIH1cblxuICAgIGlmIChjb21tYW5kLndpZGdldCkge1xuICAgICAgcGF0aCArPSAnLycgKyBjb21tYW5kLndpZGdldDtcbiAgICB9XG5cbiAgICBpZiAoY29tbWFuZC50eXBlKSB7XG4gICAgICBwYXRoICs9ICcvJyArIGNvbW1hbmQudHlwZTtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIHNldHRpbmdzKSB7XG4gICAgICBwYXJhbXMucHVzaCgnc2V0dGluZ3NbJyArIGtleSArICddPScgKyBzZXR0aW5nc1trZXldKTtcbiAgICB9XG4gICAgcGFyYW1zLnB1c2goJ21vZHVsZT0nICsgdGhpcy5tb2R1bGVOYW1lKTtcbiAgICBwYXRoICs9ICc/JyArIHBhcmFtcy5qb2luKCcmJyk7XG5cbiAgICB2YXIgYWpheCA9IERydXBhbC5hamF4KHtcbiAgICAgIHVybDogcGF0aCxcbiAgICAgIHByb2dyZXNzOiB7XG4gICAgICAgIG1lc3NhZ2U6IFwiXCIsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgYWpheC5vcHRpb25zLmRhdGFbJ2VkaXRvckNvbnRleHQnXSA9IGNvbW1hbmQuZWRpdG9yQ29udGV4dC5nZXQoJ2lkJyk7XG4gICAgZGVsZXRlIGNvbW1hbmQuZWRpdG9yQ29udGV4dDtcblxuICAgIGlmIChjb21tYW5kLmVkaXRzKSB7XG4gICAgICBhamF4Lm9wdGlvbnMuZGF0YVsnbmVzdGVkQ29udGV4dHMnXSA9IF8ua2V5cyhjb21tYW5kLmVkaXRzKTtcbiAgICB9XG5cbiAgICB2YXIgY29tcGxldGUgPSBhamF4Lm9wdGlvbnMuY29tcGxldGU7XG5cbiAgICBhamF4Lm9wdGlvbnMuY29tcGxldGUgPSBmdW5jdGlvbiAoeG1saHR0cHJlcXVlc3QsIHN0YXR1cykge1xuICAgICAgY29tcGxldGUuY2FsbChhamF4Lm9wdGlvbnMsIHhtbGh0dHByZXF1ZXN0LCBzdGF0dXMpO1xuICAgICAgRHJ1cGFsLmFqYXguaW5zdGFuY2VzLnNwbGljZShhamF4Lmluc3RhbmNlSW5kZXgsIDEpO1xuICAgIH1cblxuICAgIGFqYXguZXhlY3V0ZSgpO1xuICB9LFxuXG4gIF9nZXQ6IGZ1bmN0aW9uKGlkLCByZXNvbHZlcikge1xuICAgICQuZ2V0KCcvYWpheC9wYXJhZ3JhcGhzLWVkaXRvci9zY2hlbWEvJyArIGlkLCAnJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgIHJlc29sdmVyLnJlc29sdmUocmVzcG9uc2UpO1xuICAgIH0pO1xuICB9XG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIERydXBhbCBBUEkgaW50ZWdyYXRpb25zIGZvciBwYXJhZ3JhcGhzX2VkaXRvci5cbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgRHJ1cGFsID0gcmVxdWlyZSgnZHJ1cGFsJyksXG4gIGRydXBhbFNldHRpbmdzID0gcmVxdWlyZSgnZHJ1cGFsLXNldHRpbmdzJyksXG4gICQgPSByZXF1aXJlKCdqcXVlcnknKSxcbiAgV2lkZ2V0QmluZGluZ1Byb3RvY29sID0gcmVxdWlyZSgnLi9XaWRnZXRCaW5kaW5nUHJvdG9jb2wnKTtcbiAgV2lkZ2V0QmluZGVyID0gcmVxdWlyZSgnd2lkZ2V0LWJpbmRlcicpO1xuXG5yZXF1aXJlKCcuL0J1bmRsZVNlbGVjdG9yJyk7XG5cbi8qKlxuICoge0BuYW1lc3BhY2V9XG4gKi9cbkRydXBhbC5wYXJhZ3JhcGhzX2VkaXRvciA9IHt9O1xuXG4vKipcbiAqIENvbW1hbmQgdG8gcHJvY2VzcyByZXNwb25zZSBkYXRhIGZyb20gcGFyYWdyYXBocyBlZGl0b3IgY29tbWFuZHMuXG4gKlxuICogQHBhcmFtIHtEcnVwYWwuQWpheH0gW2FqYXhdXG4gKiAgIHtAbGluayBEcnVwYWwuQWpheH0gb2JqZWN0IGNyZWF0ZWQgYnkge0BsaW5rIERydXBhbC5hamF4fS5cbiAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZVxuICogICBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgQWpheCByZXF1ZXN0LlxuICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlLmlkXG4gKiAgIFRoZSBtb2RlbCBpZCBmb3IgdGhlIGNvbW1hbmQgdGhhdCB3YXMgdXNlZC5cbiAqL1xuRHJ1cGFsLkFqYXhDb21tYW5kcy5wcm90b3R5cGUucGFyYWdyYXBoc19lZGl0b3JfZGF0YSA9IGZ1bmN0aW9uKGFqYXgsIHJlc3BvbnNlLCBzdGF0dXMpe1xuICB2YXIgbW9kdWxlX25hbWUgPSByZXNwb25zZS5tb2R1bGU7XG4gIGRlbGV0ZSByZXNwb25zZS5tb2R1bGU7XG4gIERydXBhbC5wYXJhZ3JhcGhzX2VkaXRvci5pbnN0YW5jZXNbbW9kdWxlX25hbWVdLmdldFN5bmNBY3Rpb25SZXNvbHZlcigpLnJlc29sdmUocmVzcG9uc2UpO1xufVxuXG4vKipcbiAqIFRoZW1lIGZ1bmN0aW9uIGZvciBnZW5lcmF0aW5nIHBhcmFncmFwaHMgZWRpdG9yIHdpZGdldHMuXG4gKlxuICogQHJldHVybiB7c3RyaW5nfVxuICogICBBIHN0cmluZyByZXByZXNlbnRpbmcgYSBET00gZnJhZ21lbnQuXG4gKi9cbkRydXBhbC50aGVtZS5wYXJhZ3JhcGhzRWRpdG9yV2lkZ2V0ID0gZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIG1hcmt1cCwgYWN0aW9ucykge1xuICBfLmVhY2goYWN0aW9ucywgZnVuY3Rpb24oZGVmLCBpZCkge1xuICAgIGRlZi50aXRsZSA9IERydXBhbC50KGRlZi50aXRsZSk7XG4gIH0pO1xuICByZXR1cm4gV2lkZ2V0QmluZGVyLmRlZmF1bHRzLnZpZXdzWydlZGl0b3InXS5vcHRpb25zLnRlbXBsYXRlKGVsZW1lbnRGYWN0b3J5LCBtYXJrdXAsIGFjdGlvbnMpO1xufVxuXG4vKipcbiAqIFRoZW1lIGZ1bmN0aW9uIGZvciBnZW5lcmF0aW5nIHBhcmFncmFwaHMgZWRpdG9yIHdpZGdldHMuXG4gKlxuICogQHJldHVybiB7c3RyaW5nfVxuICogICBBIHN0cmluZyByZXByZXNlbnRpbmcgYSBET00gZnJhZ21lbnQuXG4gKi9cbkRydXBhbC50aGVtZS5wYXJhZ3JhcGhzRWRpdG9yRXhwb3J0ID0gZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIGZpZWxkcywgZWRpdHMpIHtcbiAgcmV0dXJuIFdpZGdldEJpbmRlci5kZWZhdWx0cy52aWV3c1snZXhwb3J0J10ub3B0aW9ucy50ZW1wbGF0ZShlbGVtZW50RmFjdG9yeSwgZmllbGRzLCBlZGl0cyk7XG59XG5cbkRydXBhbC5wYXJhZ3JhcGhzX2VkaXRvci5pbnN0YW5jZXMgPSB7fTtcblxuRHJ1cGFsLnBhcmFncmFwaHNfZWRpdG9yLnJlZ2lzdGVyID0gZnVuY3Rpb24obW9kdWxlX25hbWUsIGFkYXB0ZXIpIHtcbiAgdmFyIGNvbmZpZyA9IFdpZGdldEJpbmRlci5jb25maWcoKTtcblxuICBjb25maWcucGx1Z2lucyA9IHtcbiAgICBhZGFwdGVyOiBhZGFwdGVyLFxuICAgIHByb3RvY29sOiBuZXcgV2lkZ2V0QmluZGluZ1Byb3RvY29sKG1vZHVsZV9uYW1lKSxcbiAgfTtcblxuICBjb25maWcuZWxlbWVudHMud2lkZ2V0ID0ge1xuICAgIHRhZzogJ3BhcmFncmFwaCcsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgJ2RhdGEtdXVpZCc6ICc8dXVpZD4nLFxuICAgICAgJ2RhdGEtY29udGV4dC1oaW50JzogJzxjb250ZXh0PicsXG4gICAgICAnZGF0YS12aWV3bW9kZSc6ICc8dmlld21vZGU+JyxcbiAgICB9LFxuICAgIHNlbGVjdG9yOiAncGFyYWdyYXBoW2RhdGEtY29udGV4dC1oaW50XSdcbiAgfTtcblxuICBjb25maWcuZWxlbWVudHMuZmllbGQgPSB7XG4gICAgdGFnOiAncGFyYWdyYXBoLWZpZWxkJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAnZGF0YS1maWVsZC1uYW1lJzogJzxuYW1lPicsXG4gICAgICAnZGF0YS1jb250ZXh0JzogJzxjb250ZXh0PicsXG4gICAgICAnZGF0YS1tdXRhYmxlJzogJzxlZGl0YWJsZT4nLFxuICAgIH0sXG4gICAgc2VsZWN0b3I6ICdwYXJhZ3JhcGgtZmllbGRbZGF0YS1tdXRhYmxlPVwidHJ1ZVwiXSwuZWRpdGFibGUtcGFyYWdyYXBoLWZpZWxkJyxcbiAgfTtcblxuICBjb25maWcudmlld3NbJ2VkaXRvciddLm9wdGlvbnMudGVtcGxhdGUgPSBEcnVwYWwudGhlbWUucGFyYWdyYXBoc0VkaXRvcldpZGdldDtcbiAgY29uZmlnLnZpZXdzWydleHBvcnQnXS5vcHRpb25zLnRlbXBsYXRlID0gRHJ1cGFsLnRoZW1lLnBhcmFncmFwaHNFZGl0b3JFeHBvcnQ7XG5cbiAgY29uZmlnLmRhdGEgPSBkcnVwYWxTZXR0aW5ncy5wYXJhZ3JhcGhzX2VkaXRvcjtcblxuICByZXR1cm4gdGhpcy5pbnN0YW5jZXNbbW9kdWxlX25hbWVdID0gbmV3IFdpZGdldEJpbmRlcihjb25maWcpO1xufVxuXG5EcnVwYWwucGFyYWdyYXBoc19lZGl0b3IuV2lkZ2V0QmluZGVyID0gV2lkZ2V0QmluZGVyO1xuIiwidmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gICQgPSByZXF1aXJlKCdqcXVlcnknKSxcbiAgV2lkZ2V0TW9kZWwgPSByZXF1aXJlKCcuL01vZGVscy9XaWRnZXRNb2RlbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVkaXRvclZpZXcpIHtcbiAgdGhpcy5fZWRpdG9yVmlldyA9IGVkaXRvclZpZXc7XG4gIHRoaXMuX3dpZGdldEZhY3RvcnkgPSBlZGl0b3JWaWV3Lm1vZGVsLndpZGdldEZhY3Rvcnk7XG4gIHRoaXMuX3ZpZXdGYWN0b3J5ID0gZWRpdG9yVmlldy5tb2RlbC52aWV3RmFjdG9yeTtcbiAgdGhpcy5fd2lkZ2V0U3RvcmUgPSBlZGl0b3JWaWV3Lm1vZGVsLndpZGdldFN0b3JlO1xuICB0aGlzLl9lZGl0QnVmZmVyTWVkaWF0b3IgPSBlZGl0b3JWaWV3Lm1vZGVsLmVkaXRCdWZmZXJNZWRpYXRvcjtcbiAgdGhpcy5fY29udGV4dFJlc29sdmVyID0gZWRpdG9yVmlldy5tb2RlbC5jb250ZXh0UmVzb2x2ZXI7XG59XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBSZXF1ZXN0cyB0aGF0IGEgbmV3IHdpZGdldCBiZSBpbnNlcnRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXRFbFxuICAgKiAgIFRoZSBlbGVtZW50IHRoYXQgdGhlIG5ldyB3aWRnZXQgd2lsbCBiZSBpbnNlcnRlZCBpbnRvLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgKiAgIFRoZSB0eXBlIG9mIHRoZSBpdGVtIHRvIHJlcXVlc3QuIFRoaXMgcGFyYW1ldGVyIGlzIG9wdGlvbmFsLlxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbigkdGFyZ2V0RWwsIHR5cGUpIHtcbiAgICB0aGlzLl9lZGl0QnVmZmVyTWVkaWF0b3IucmVxdWVzdEJ1ZmZlckl0ZW0odHlwZSwgJHRhcmdldEVsKTtcbiAgfSxcblxuICAvKipcbiAgICogTWFrZXMgd2lkZ2V0IG1hbmFnZXIgYXdhcmUgb2YgYSBuZXdseSBpbnNlcnRlZCB3aWRnZXQuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIG1vc3QgaW1wb3J0YW50IG1ldGhvZCBoZXJlLiBJdCBpcyBjYWxsZWQgd2hlbiBhIG5ldyB3aWRnZXQgaXNcbiAgICogY3JlYXRlZCBpbiB0aGUgZWRpdG9yIGluIG9yZGVyIHRvIGluc3RydWN0IHRoZSBtYW5hZ2VyIHRvIHN0YXJ0IHRyYWNraW5nXG4gICAqIHRoZSBsaWZlY3ljbGUgb2YgdGhlIHdpZGdldCwgaXRzIGRvbSByZXByZXNlbnRhdGlvbiwgYW5kIHRoZSBlZGl0IGJ1ZmZlclxuICAgKiBkYXRhIGl0ZW0gaXQgcmVmZXJlbmNlcy5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gd2lkZ2V0XG4gICAqICAgVGhlIGVkaXRvciByZXByZXNlbnRhdGlvbiBvZiBhIHdpZGdldC4gVGhpcyBjYW4gYmUgYW55IGRhdGEgeW91IHdhbnQgdG9cbiAgICogICBhc3NvY2lhdGUgd2l0aCB0aGUgd2lkZ2V0LCBidXQgd2lsbCB1c3VhbGx5IGJlIGFuIG9iamVjdCBnZW5lcmF0ZWQgYnkgdGhlXG4gICAqICAgZWRpdG9yLiBUaGlzIHdpbGwgYmUgYXZhaWxhYmxlIHRvIHRoZSBlZGl0b3IgYWRhcHRlciBkdXJpbmcgd2lkZ2V0XG4gICAqICAgb3BlcmF0aW9ucy5cbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBBIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgd2lkZ2V0LiBUaGlzIHdpbGwgdXN1YWxseSBiZSBnZW5lcmF0ZWQgYnkgdGhlXG4gICAqICAgZWRpdG9yLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldEVsXG4gICAqICAgVGhlIHJvb3QgZWxlbWVudCBvZiB0aGUgd2lkZ2V0IHdpdGhpbiB0aGUgZWRpdG9yLlxuICAgKi9cbiAgYmluZDogZnVuY3Rpb24od2lkZ2V0LCBpZCwgJHRhcmdldEVsKSB7XG4gICAgLy8gQ3JlYXRlIGEgbW9kZWwgZm9yIHJlcHJlc2VudGluZyB0aGUgd2lkZ2V0LlxuICAgIHZhciB3aWRnZXRNb2RlbCA9IHRoaXMuX3dpZGdldEZhY3RvcnkuY3JlYXRlKHdpZGdldCwgaWQsICR0YXJnZXRFbCk7XG4gICAgdmFyIHRhcmdldENvbnRleHQgPSB3aWRnZXRNb2RlbC5lZGl0QnVmZmVySXRlbVJlZi50YXJnZXRDb250ZXh0O1xuICAgIHZhciBzb3VyY2VDb250ZXh0ID0gd2lkZ2V0TW9kZWwuZWRpdEJ1ZmZlckl0ZW1SZWYuc291cmNlQ29udGV4dDtcblxuICAgIC8vIENyZWF0ZSBhIHdpZGdldCB2aWV3IHRvIHJlbmRlciB0aGUgd2lkZ2V0IHdpdGhpbiBFZGl0b3IuXG4gICAgdmFyIHdpZGdldEVkaXRvclZpZXcgPSB0aGlzLl92aWV3RmFjdG9yeS5jcmVhdGUod2lkZ2V0TW9kZWwsICR0YXJnZXRFbCwgJ2VkaXRvcicpO1xuXG4gICAgLy8gQWRkIHRoZSB3aWRnZXQgdG8gdGhlIHdpZGdldCB0byB0aGUgdGFibGUgdG8ga2VlcCB0cmFjayBvZiBpdC5cbiAgICB0aGlzLl93aWRnZXRTdG9yZS5hZGQod2lkZ2V0TW9kZWwsIHdpZGdldEVkaXRvclZpZXcpO1xuXG4gICAgLy8gSWYgdGhlIHdpZGdldCBpcyBub3QgY3VycmVudGx5IHVzaW5nIHRoZSBlZGl0b3IgdmlldyBtb2RlLCB3ZSB0cmVhdFxuICAgIC8vIGl0IGFzIGJlaW5nIGluICdleHBvcnQnIGZvcm0uIFRoaXMgbWVhbnMgd2UgaGF2ZSB0byBjcmVhdGUgYW4gZXhwb3J0XG4gICAgLy8gdmlldyB0byBsb2FkIHRoZSBkYXRhLlxuICAgIGlmICghd2lkZ2V0RWRpdG9yVmlldy5pc0VkaXRvclZpZXdSZW5kZXJlZCgpKSB7XG4gICAgICB0aGlzLl92aWV3RmFjdG9yeS5jcmVhdGVUZW1wb3Jhcnkod2lkZ2V0TW9kZWwsICR0YXJnZXRFbCwgJ2V4cG9ydCcpLnNhdmUoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB3aWRnZXRFZGl0b3JWaWV3LnNhdmUoKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHdpZGdldCByZWZlcmVuY2luZyB0aGUgc2FtZSBidWZmZXIgaXRlbSB3ZVxuICAgIC8vIG5lZWQgdG8gZHVwbGljYXRlIGl0LiBPbmx5IG9uZSB3aWRnZXQgY2FuIGV2ZXIgcmVmZXJlbmNlIGEgZ2l2ZW5cbiAgICAvLyBidWZmZXIgaXRlbS4gQWRkaXRpb25hbGx5LCBpZiB0aGUgc291cmNlIGNvbnRleHQgaXMgbm90IHRoZSBzYW1lIGFzIHRoZVxuICAgIC8vIHRhcmdldCBjb250ZXh0IHdlIG5lZWQgdG8gZHVwbGljYXRlLiBBIGNvbnRleHQgbWlzbWF0Y2ggZXNzZW50aWFsbHlcbiAgICAvLyBtZWFucyBzb21ldGhpbmcgd2FzIGNvcGllZCBmcm9tIGFub3RoZXIgZmllbGQgaW5zdGFuY2UgaW50byB0aGlzIGZpZWxkXG4gICAgLy8gaW5zdGFuY2UsIHNvIGFsbCB0aGUgZGF0YSBhYm91dCBpdCBpcyBpbiB0aGUgb3JpZ2luYWwgZmllbGQgaW5zdGFuY2UuXG4gICAgdmFyIG1hdGNoaW5nQ29udGV4dHMgPSBzb3VyY2VDb250ZXh0LmdldCgnaWQnKSA9PT0gdGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyk7XG4gICAgaWYgKHRoaXMuX3dpZGdldFN0b3JlLmNvdW50KHdpZGdldE1vZGVsKSA+IDEgfHwgIW1hdGNoaW5nQ29udGV4dHMpIHtcbiAgICAgIHdpZGdldE1vZGVsLmR1cGxpY2F0ZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHdpZGdldEVkaXRvclZpZXcucmVuZGVyKCk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgdW5iaW5kOiBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuX2FwcGx5VG9Nb2RlbChpZCwgZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICAgIHRoaXMuX3dpZGdldFN0b3JlLnJlbW92ZSh3aWRnZXRNb2RlbCwgdHJ1ZSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgYW4gZXhpc3Rpbmcgd2lkZ2V0LlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIFRoZSB3aWRnZXQgaWQgdG8gbG9va3VwLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRNb2RlbH1cbiAgICogICBBIHdpZGdldCBtb2RlbCBpZiB0aGUgaWQgZXhpc3RlZCBpbiB0aGUgc3RvcmUsIG9yIHVuZGVmaW5lZCBvdGhlcndpc2UuXG4gICAqL1xuICBnZXQ6IGZ1bmN0aW9uKGlkLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZGdldFN0b3JlLmdldChpZCwgeyByYXc6IHRydWUgfSkubW9kZWw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlcXVlc3RzIGFuIGVkaXQgb3BlcmF0aW9uIGZvciBhIHdpZGdldCdzIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbS5cbiAgICpcbiAgICogVGhpcyB0cmlnZ2VycyBhbiAnZWRpdCcgY29tbWFuZCBmb3IgdGhlIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbS4gSXQnc1xuICAgKiB1cCB0byB0aGUgc3luYyBwcm90Y29sIHBsdWdpbiwgYW5kIGFzc29jaWF0ZWQgbG9naWMgdG8gZGV0ZXJtaW5lIGhvdyB0b1xuICAgKiBoYW5kbGUgdGhpcyBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgbW9kZWwgdG8gZ2VuZXJhdGUgYW4gZWRpdCByZXF1ZXN0IGZvci5cbiAgICovXG4gIGVkaXQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5fYXBwbHlUb01vZGVsKGlkLCBmdW5jdGlvbih3aWRnZXRNb2RlbCkge1xuICAgICAgd2lkZ2V0TW9kZWwuZWRpdCgpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTYXZlcyBhbnkgaW5saW5lIGVkaXRzIHRvIHRoZSB3aWRnZXQuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIGRvZXMgbm90IHRyaWdnZXIgYSBzZXJ2ZXIgc3luYy4gSXQgc2ltcGx5IHVwZGF0ZXMgdGhlIHdpZGdldFxuICAgKiBtb2RlbCBiYXNlZCBvbiB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgZWRpdG9yIHZpZXcuXG4gICAqXG4gICAqIFRoZSBlZGl0b3IgaXMgaW4gY2hhcmdlIG9mIG1hbmFnaW5nIHRoZSBnZW5lcmF0ZWQgbWFya3VwIGFuZCBzZW5kaW5nIGl0IHRvXG4gICAqIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdG8gc2F2ZSBpbmxpbmUgZWRpdHMgZm9yLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldEVsXG4gICAqICAgVGhlIGVsZW1lbnQgdG8gc2F2ZSB0aGUgb3V0cHV0ZWQgZGF0YSBmb3JtYXQgdG8uXG4gICAqXG4gICAqIEByZXR1cm4ge1dpZGdldE1vZGVsfVxuICAgKiAgIFRoZSBzYXZlZCBtb2RlbC5cbiAgICovXG4gIHNhdmU6IGZ1bmN0aW9uKGlkLCAkdGFyZ2V0RWwpIHtcbiAgICByZXR1cm4gdGhpcy5fYXBwbHlUb01vZGVsKGlkLCBmdW5jdGlvbih3aWRnZXRNb2RlbCkge1xuICAgICAgdGhpcy5fdmlld0ZhY3RvcnkuY3JlYXRlVGVtcG9yYXJ5KHdpZGdldE1vZGVsLCAkdGFyZ2V0RWwsICdlZGl0b3InKS5zYXZlKCk7XG4gICAgICB0aGlzLl92aWV3RmFjdG9yeS5jcmVhdGVUZW1wb3Jhcnkod2lkZ2V0TW9kZWwsICR0YXJnZXRFbCwgJ2V4cG9ydCcpLnJlbmRlcigpLnNhdmUoKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRGVzdHJveXMgYSB3aWRnZXRzIHRyYWNraW5nIGRhdGEgYW5kIGluaXRpYXRlcyB3aWRnZXQgZGVzdHJ1Y3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdG8gYmUgZGVzdHJveWVkLlxuICAgKiBAcGFyYW0ge2Jvb2x9IHdpZGdldERlc3Ryb3llZFxuICAgKiAgIFNldCB0byB0cnVlIGlmIHRoZSB3aWRnZXQgaGFzIGFscmVhZHkgYmVlbiBkZXN0cm95ZWQgaW4gdGhlIGVkaXRvci5cbiAgICogICBTZXR0aW5nIHRoaXMgdG8gZmFsc2Ugd2lsbCByZXN1bHQgaW4gdGhlIGRlc3RydWN0aW9uIG9mIHRoZSB3aWRnZXQgd2l0aGluXG4gICAqICAgdGhlIGVkaXRvci5cbiAgICovXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKGlkLCB3aWRnZXREZXN0cm95ZWQpIHtcbiAgICB0aGlzLl9hcHBseVRvTW9kZWwoaWQsIGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgICBpZiAod2lkZ2V0RGVzdHJveWVkKSB7XG4gICAgICAgIHdpZGdldE1vZGVsLnNldFN0YXRlKFdpZGdldE1vZGVsLlN0YXRlLkRFU1RST1lFRF9XSURHRVQpO1xuICAgICAgfVxuICAgICAgd2lkZ2V0TW9kZWwuZGVzdHJveSgpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDbGVhbnMgdXAgYWZ0ZXIgdGhlIHdpZGdldCBtYW5hZ2VyIG9iamVjdC5cbiAgICovXG4gIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lZGl0b3JWaWV3Lm1vZGVsLmRlc3Ryb3koKTtcbiAgICB0aGlzLl9lZGl0b3JWaWV3LnN0b3BMaXN0ZW5pbmcoKTtcbiAgICB0aGlzLl93aWRnZXRTdG9yZS5jbGVhbnVwKCk7XG4gICAgdGhpcy5fZWRpdEJ1ZmZlck1lZGlhdG9yLmNsZWFudXAoKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldFNldHRpbmdzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldEVkaXRvckNvbnRleHQoKS5nZXRTZXR0aW5ncygpO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0U2V0dGluZzogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9jb250ZXh0UmVzb2x2ZXIuZ2V0RWRpdG9yQ29udGV4dCgpLmdldFNldHRpbmcobmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICByZXNvbHZlQ29udGV4dDogZnVuY3Rpb24oJGVsLCB0eXBlKSB7XG4gICAgaWYgKCF0eXBlKSB7XG4gICAgICB0eXBlID0gJ3RhcmdldCc7XG4gICAgfVxuICAgIGlmICh0eXBlID09ICd0YXJnZXQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY29udGV4dFJlc29sdmVyLnJlc29sdmVUYXJnZXRDb250ZXh0KCRlbCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgPT0gJ3NvdXJjZScpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0UmVzb2x2ZXIucmVzb2x2ZVNvdXJjZUNvbnRleHQoJGVsKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29udGV4dCB0eXBlLicpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQSBjb252ZW5pZW5jZSBmdW5jdGlvbiBmb3IgbG9va2luZyB1cCBhIHdpZGdldCBhbmQgYXBwbHlpbmcgYW4gYWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgd2lkZ2V0IHRvIGFjdCBvbi5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogICBUaGUgYWN0aW9uIHRvIGFwcGx5IHRoZSBtb2RlbCwgaWYgZm91bmQuXG4gICAqXG4gICAqIEByZXR1cm4ge1dpZGdldE1vZGVsfVxuICAgKiAgIFRoZSBtb2RlbCBhY3RlZCBvbiwgaWYgYW4gYWN0aW9uIHdhcyBhcHBsaWVkLlxuICAgKi9cbiAgX2FwcGx5VG9Nb2RlbDogZnVuY3Rpb24oaWQsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHdpZGdldE1vZGVsID0gdGhpcy5nZXQoaWQpO1xuICAgIGlmICh3aWRnZXRNb2RlbCkge1xuICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgW3dpZGdldE1vZGVsXSk7XG4gICAgICByZXR1cm4gd2lkZ2V0TW9kZWw7XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgY29sbGVjdGlvbiBvZiBzY2hlbWEgbW9kZWxzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgQ29udGV4dE1vZGVsID0gcmVxdWlyZSgnLi4vTW9kZWxzL0NvbnRleHRNb2RlbCcpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cbiAgbW9kZWw6IENvbnRleHRNb2RlbCxcblxuICAvKipcbiAgICovXG4gIGdldDogZnVuY3Rpb24oY29udGV4dFN0cmluZywgc2V0dGluZ3MsIHNraXBMYXp5TG9hZCkge1xuICAgIGlmICh0eXBlb2YgY29udGV4dFN0cmluZyA9PSAnc3RyaW5nJyAmJiAhc2tpcExhenlMb2FkKSB7XG4gICAgICBpZiAoIUJhY2tib25lLkNvbGxlY3Rpb24ucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIGNvbnRleHRTdHJpbmcpKSB7XG4gICAgICAgIGlmICghc2V0dGluZ3MpIHtcbiAgICAgICAgICBzZXR0aW5ncyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHZhciBtb2RlbCA9IG5ldyBDb250ZXh0TW9kZWwoeyBpZDogY29udGV4dFN0cmluZywgc2V0dGluZ3M6IHNldHRpbmdzIH0pO1xuICAgICAgICB0aGlzLmFkZChtb2RlbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBCYWNrYm9uZS5Db2xsZWN0aW9uLnByb3RvdHlwZS5nZXQuY2FsbCh0aGlzLCBjb250ZXh0U3RyaW5nKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHRvdWNoOiBmdW5jdGlvbihjb250ZXh0U3RyaW5nKSB7XG4gICAgdGhpcy5nZXQoY29udGV4dFN0cmluZyk7XG4gIH1cblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBjb21tYW5kcyBmcm9tIHRoZSBxdWV1ZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIEVkaXRCdWZmZXJJdGVtTW9kZWwgPSByZXF1aXJlKCcuLi9Nb2RlbHMvRWRpdEJ1ZmZlckl0ZW1Nb2RlbCcpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cbiAgbW9kZWw6IEVkaXRCdWZmZXJJdGVtTW9kZWwsXG5cbiAgLyoqXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9jb250ZXh0SWQgPSBvcHRpb25zLmNvbnRleHRJZDtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldEl0ZW06IGZ1bmN0aW9uKGNvbW1hbmRFbWl0dGVyLCB1dWlkKSB7XG4gICAgdmFyIGl0ZW1Nb2RlbCA9IHRoaXMuZ2V0KHV1aWQpO1xuICAgIGlmICghaXRlbU1vZGVsKSB7XG4gICAgICBpdGVtTW9kZWwgPSB0aGlzLmFkZCh7aWQ6IHV1aWR9LCB7bWVyZ2U6IHRydWV9KTtcbiAgICAgIGNvbW1hbmRFbWl0dGVyLnJlbmRlcih0aGlzLmdldENvbnRleHRJZCgpLCB1dWlkKTtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZW1Nb2RlbDtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHNldEl0ZW06IGZ1bmN0aW9uKGl0ZW1Nb2RlbCkge1xuICAgIHJldHVybiB0aGlzLmFkZChpdGVtTW9kZWwsIHttZXJnZTogdHJ1ZX0pO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgcmVtb3ZlSXRlbTogZnVuY3Rpb24odXVpZCkge1xuICAgIHRoaXMucmVtb3ZlKHV1aWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0Q29udGV4dElkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29udGV4dElkO1xuICB9XG59KTtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICBFZGl0b3JNb2RlbCA9IHJlcXVpcmUoJy4uL01vZGVscy9FZGl0b3JNb2RlbCcpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gIG1vZGVsOiBFZGl0b3JNb2RlbCxcbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSBjb2xsZWN0aW9uIG9mIHNjaGVtYSBlbnRyeSBtb2RlbHNcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIFNjaGVtYU1vZGVsID0gcmVxdWlyZSgnLi4vTW9kZWxzL1NjaGVtYU1vZGVsJyk7XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblxuICBtb2RlbDogU2NoZW1hTW9kZWwsXG5cbiAgLyoqXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmxpc3RlblRvKG9wdGlvbnMuY29udGV4dENvbGxlY3Rpb24sICdhZGQnLCB0aGlzLmFkZENvbnRleHRTY2hlbWEpO1xuICAgIHRoaXMuX2Rpc3BhdGNoZXIgPSBvcHRpb25zLmRpc3BhdGNoZXI7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBpc0FsbG93ZWQ6IGZ1bmN0aW9uKHNjaGVtYUlkLCB0eXBlKSB7XG4gICAgdmFyIG1vZGVsID0gdGhpcy5nZXQoc2NoZW1hSWQpO1xuICAgIHJldHVybiAhIShtb2RlbCAmJiBtb2RlbC5nZXQoJ2FsbG93ZWQnKVt0eXBlXSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBhZGRDb250ZXh0U2NoZW1hOiBmdW5jdGlvbihjb250ZXh0TW9kZWwpIHtcbiAgICB0aGlzLl9mZXRjaFNjaGVtYShjb250ZXh0TW9kZWwpO1xuICAgIHRoaXMubGlzdGVuVG8oY29udGV4dE1vZGVsLCAnY2hhbmdlOnNjaGVtYUlkJywgdGhpcy5fZmV0Y2hTY2hlbWEpO1xuICB9LFxuXG4gIF9mZXRjaFNjaGVtYTogZnVuY3Rpb24oY29udGV4dE1vZGVsKSB7XG4gICAgdmFyIGlkID0gY29udGV4dE1vZGVsLmdldCgnc2NoZW1hSWQnKTtcbiAgICBpZiAoaWQpIHtcbiAgICAgIGlmICghdGhpcy5nZXQoaWQpKSB7XG4gICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goJ0ZFVENIX1NDSEVNQScsIGlkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgV2lkZ2V0TW9kZWwgPSByZXF1aXJlKCcuLi9Nb2RlbHMvV2lkZ2V0TW9kZWwnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICBtb2RlbDogV2lkZ2V0TW9kZWwsXG59KTtcblxuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYSBtZWNoYW5pc20gZm9yIGNvbnRyb2xsaW5nIHN1YnNjcmlwdGlvbnMgdG8gbXVsdGlwbGUgY29udGV4dHMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG4vKipcbiAqIExpc3RlbnMgdG8gYSBncm91cCBvZiBjb250ZXh0J3MgZWRpdCBidWZmZXJzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCBCYWNrYm9uZS5FdmVudHMsIHtcblxuICAvKipcbiAgICogQWRkIGEgY29udGV4dCB0byB0aGUgbGlzdGVuZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7Q29udGV4dH0gY29udGV4dFxuICAgKiAgIFRoZSBjb250ZXh0IHRvIGxpc3RlbiB0by5cbiAgICovXG4gIGFkZENvbnRleHQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICB0aGlzLmxpc3RlblRvKGNvbnRleHQuZWRpdEJ1ZmZlciwgJ2FkZCcsIHRoaXMuX3RyaWdnZXJFdmVudHMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiAnaW5zZXJ0SXRlbScgb3IgJ3VwZGF0ZUl0ZW0nIGV2ZW50IGZvciBhIG1vZGVsLlxuICAgKlxuICAgKiBAcGFyYW0ge0VkaXRCdWZmZXJJdGVtTW9kZWx9IGJ1ZmZlckl0ZW1Nb2RlbFxuICAgKiAgIFRoZSBtb2RlbCB0aGF0IHRoZSBldmVudCBpcyBiZWluZyB0cmlnZ2VyZWQgZm9yLlxuICAgKi9cbiAgX3RyaWdnZXJFdmVudHM6IGZ1bmN0aW9uKGJ1ZmZlckl0ZW1Nb2RlbCkge1xuICAgIGlmIChidWZmZXJJdGVtTW9kZWwuZ2V0KCdpbnNlcnQnKSkge1xuICAgICAgdGhpcy50cmlnZ2VyKCdpbnNlcnRJdGVtJywgYnVmZmVySXRlbU1vZGVsKTtcbiAgICAgIGJ1ZmZlckl0ZW1Nb2RlbC5zZXQoe2luc2VydDogZmFsc2V9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnRyaWdnZXIoJ3VwZGF0ZUl0ZW0nLCBidWZmZXJJdGVtTW9kZWwpO1xuICAgIH1cbiAgfSxcblxuICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgfVxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBjb21tYW5kcyBmcm9tIHRoZSBxdWV1ZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0Q29sbGVjdGlvbiwgc291cmNlQ29udGV4dEF0dHJpYnV0ZSwgdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZSwgZWRpdG9yQ29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbiA9IGNvbnRleHRDb2xsZWN0aW9uO1xuICB0aGlzLl9zb3VyY2VDb250ZXh0QXR0cmlidXRlID0gc291cmNlQ29udGV4dEF0dHJpYnV0ZTtcbiAgdGhpcy5fdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZSA9IHRhcmdldENvbnRleHRBdHRyaWJ1dGU7XG4gIHRoaXMuX2VkaXRvckNvbnRleHQgPSBlZGl0b3JDb250ZXh0O1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqL1xuICByZXNvbHZlVGFyZ2V0Q29udGV4dDogZnVuY3Rpb24gKCRlbCkge1xuICAgIHZhciBjb250ZXh0SWQgPSAkZWwuYXR0cih0aGlzLl90YXJnZXRDb250ZXh0QXR0cmlidXRlKTtcbiAgICBpZiAoIWNvbnRleHRJZCkge1xuICAgICAgY29udGV4dElkID0gJGVsLmNsb3Nlc3QoJ1snICsgdGhpcy5fdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZSArICddJykuYXR0cih0aGlzLl90YXJnZXRDb250ZXh0QXR0cmlidXRlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXQoY29udGV4dElkKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHJlc29sdmVTb3VyY2VDb250ZXh0OiBmdW5jdGlvbigkZWwpIHtcbiAgICB2YXIgY29udGV4dElkID0gJGVsLmF0dHIodGhpcy5fc291cmNlQ29udGV4dEF0dHJpYnV0ZSk7XG4gICAgcmV0dXJuIGNvbnRleHRJZCA/IHRoaXMuZ2V0KGNvbnRleHRJZCkgOiB0aGlzLl9lZGl0b3JDb250ZXh0O1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0RWRpdG9yQ29udGV4dDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VkaXRvckNvbnRleHQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXQ6IGZ1bmN0aW9uKGNvbnRleHRJZCkge1xuICAgIGlmIChjb250ZXh0SWQpIHtcbiAgICAgIHZhciBzZXR0aW5ncyA9IHRoaXMuX2VkaXRvckNvbnRleHQgPyB0aGlzLl9lZGl0b3JDb250ZXh0LmdldFNldHRpbmdzKCkgOiB7fTtcbiAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbi5nZXQoY29udGV4dElkLCBzZXR0aW5ncyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX2VkaXRvckNvbnRleHQ7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgdG91Y2g6IGZ1bmN0aW9uKGNvbnRleHRJZCkge1xuICAgIHJldHVybiB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbi50b3VjaChjb250ZXh0SWQpO1xuICB9LFxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGFuIGFjdGlvbmFibGUgcmVmZXJlbmNlIHRvIGEgZWRpdCBidWZmZXIgaXRlbS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGJ1ZmZlckl0ZW1Nb2RlbCwgc291cmNlQ29udGV4dCwgdGFyZ2V0Q29udGV4dCwgY29tbWFuZEVtaXR0ZXIpIHtcbiAgdGhpcy5lZGl0QnVmZmVySXRlbSA9IGJ1ZmZlckl0ZW1Nb2RlbDsgXG4gIHRoaXMuc291cmNlQ29udGV4dCA9IHNvdXJjZUNvbnRleHQ7IFxuICB0aGlzLnRhcmdldENvbnRleHQgPSB0YXJnZXRDb250ZXh0OyBcbiAgdGhpcy5fY29tbWFuZEVtaXR0ZXIgPSBjb21tYW5kRW1pdHRlcjsgXG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICBlZGl0OiBmdW5jdGlvbihlZGl0cykge1xuICAgIHRoaXMuX2NvbW1hbmRFbWl0dGVyLmVkaXQodGhpcy50YXJnZXRDb250ZXh0LmdldCgnaWQnKSwgdGhpcy5lZGl0QnVmZmVySXRlbS5nZXQoJ2lkJyksIGVkaXRzKTtcbiAgfSxcblxuICByZW5kZXI6IGZ1bmN0aW9uKGVkaXRzKSB7XG4gICAgdGhpcy5fY29tbWFuZEVtaXR0ZXIucmVuZGVyKHRoaXMudGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyksIHRoaXMuZWRpdEJ1ZmZlckl0ZW0uZ2V0KCdpZCcpLCBlZGl0cyk7XG4gIH0sXG5cbiAgZHVwbGljYXRlOiBmdW5jdGlvbih3aWRnZXRJZCwgZWRpdHMpIHtcbiAgICB0aGlzLl9jb21tYW5kRW1pdHRlci5kdXBsaWNhdGUodGhpcy50YXJnZXRDb250ZXh0LmdldCgnaWQnKSwgdGhpcy5zb3VyY2VDb250ZXh0LmdldCgnaWQnKSwgdGhpcy5lZGl0QnVmZmVySXRlbS5nZXQoJ2lkJyksIHdpZGdldElkLCBlZGl0cyk7XG4gIH1cblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhIGZhY3RvcnkgZm9yIGNyZWF0aW5nIGVkaXQgYnVmZmVyIGl0ZW0gcmVmZXJlbmNlcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBFZGl0QnVmZmVySXRlbVJlZiA9IHJlcXVpcmUoJy4vRWRpdEJ1ZmZlckl0ZW1SZWYnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0UmVzb2x2ZXIsIGNvbW1hbmRFbWl0dGVyKSB7XG4gIHRoaXMuX2NvbnRleHRSZXNvbHZlciA9IGNvbnRleHRSZXNvbHZlcjtcbiAgdGhpcy5fY29tbWFuZEVtaXR0ZXIgPSBjb21tYW5kRW1pdHRlcjtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIGNyZWF0ZTogZnVuY3Rpb24oYnVmZmVySXRlbU1vZGVsLCBzb3VyY2VDb250ZXh0LCB0YXJnZXRDb250ZXh0KSB7XG4gICAgdmFyIGZhbGxiYWNrQ29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5nZXQoYnVmZmVySXRlbU1vZGVsLmNvbGxlY3Rpb24uZ2V0Q29udGV4dElkKCkpO1xuXG4gICAgaWYgKCFzb3VyY2VDb250ZXh0KSB7XG4gICAgICBzb3VyY2VDb250ZXh0ID0gZmFsbGJhY2tDb250ZXh0O1xuICAgIH1cblxuICAgIGlmICghdGFyZ2V0Q29udGV4dCkge1xuICAgICAgdGFyZ2V0Q29udGV4dCA9IGZhbGxiYWNrQ29udGV4dDtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEVkaXRCdWZmZXJJdGVtUmVmKGJ1ZmZlckl0ZW1Nb2RlbCwgc291cmNlQ29udGV4dCwgdGFyZ2V0Q29udGV4dCwgdGhpcy5fY29tbWFuZEVtaXR0ZXIpO1xuICB9LFxuXG4gIGNyZWF0ZUZyb21JZHM6IGZ1bmN0aW9uKGl0ZW1JZCwgc291cmNlQ29udGV4dElkLCB0YXJnZXRDb250ZXh0SWQpIHtcbiAgICBpZiAoIXNvdXJjZUNvbnRleHRJZCB8fCAhdGFyZ2V0Q29udGV4dElkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NvdXJjZSBhbmQgdGFyZ2V0IGNvbnRleHQgaWRzIGFyZSBleHBsaWNpdGx5IHJlcXVpcmVkJyk7XG4gICAgfVxuICAgIHZhciBzb3VyY2VDb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldChzb3VyY2VDb250ZXh0SWQpO1xuICAgIHZhciB0YXJnZXRDb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLmdldCh0YXJnZXRDb250ZXh0SWQpO1xuICAgIHZhciBidWZmZXJJdGVtTW9kZWwgPSBzb3VyY2VDb250ZXh0LmVkaXRCdWZmZXIuZ2V0SXRlbSh0aGlzLl9jb21tYW5kRW1pdHRlciwgaXRlbUlkKTtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGUoYnVmZmVySXRlbU1vZGVsLCBzb3VyY2VDb250ZXh0LCB0YXJnZXRDb250ZXh0KTtcbiAgfSxcblxuICByZXF1ZXN0TmV3SXRlbTogZnVuY3Rpb24odGFyZ2V0Q29udGV4dCwgdHlwZSl7XG4gICAgdGhpcy5fY29tbWFuZEVtaXR0ZXIuaW5zZXJ0KHRhcmdldENvbnRleHQsIHR5cGUpO1xuICB9LFxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGEgbWVkaWF0b3IgZm9yIG5lZ290aWF0aW5nIHRoZSBpbnNlcnRpb24gb2YgbmV3IGl0ZW1zLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnksIGVsZW1lbnRGYWN0b3J5LCBjb250ZXh0TGlzdGVuZXIsIGFkYXB0ZXIsIGNvbnRleHRSZXNvbHZlcikge1xuICB0aGlzLl9lZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkgPSBlZGl0QnVmZmVySXRlbVJlZkZhY3Rvcnk7XG4gIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gZWxlbWVudEZhY3Rvcnk7XG4gIHRoaXMuX2NvbnRleHRMaXN0ZW5lciA9IGNvbnRleHRMaXN0ZW5lcjtcbiAgdGhpcy5fYWRhcHRlciA9IGFkYXB0ZXI7XG4gIHRoaXMuX2NvbnRleHRSZXNvbHZlciA9IGNvbnRleHRSZXNvbHZlcjtcbiAgdGhpcy5saXN0ZW5Ubyh0aGlzLl9jb250ZXh0TGlzdGVuZXIsICdpbnNlcnRJdGVtJywgdGhpcy5faW5zZXJ0QnVmZmVySXRlbSk7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyB0aGUgd2lkZ2V0IGluc2VydGlvbiBmbG93LlxuICAgKi9cbiAgcmVxdWVzdEJ1ZmZlckl0ZW06IGZ1bmN0aW9uKHNjaGVtYUlkLCAkZWwpIHtcbiAgICB2YXIgdGFyZ2V0Q29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5yZXNvbHZlVGFyZ2V0Q29udGV4dCgkZWwpO1xuICAgIHRoaXMuX2NvbnRleHRMaXN0ZW5lci5hZGRDb250ZXh0KHRhcmdldENvbnRleHQpO1xuICAgIHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeS5yZXF1ZXN0TmV3SXRlbSh0YXJnZXRDb250ZXh0LmdldCgnaWQnKSwgc2NoZW1hSWQpO1xuICAgICAgXG4gIH0sXG5cbiAgY2xlYW51cDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY29udGV4dExpc3RlbmVyLmNsZWFudXAoKTtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgfSxcblxuICBfaW5zZXJ0QnVmZmVySXRlbTogZnVuY3Rpb24oYnVmZmVySXRlbU1vZGVsKSB7XG4gICAgdmFyIGl0ZW0gPSB0aGlzLl9lZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkuY3JlYXRlKGJ1ZmZlckl0ZW1Nb2RlbCk7XG5cbiAgICAvLyBJZiB0aGUgbmV3IG1vZGVsIGlzIHJlYWR5IHRvIGJlIGluc2VydGVkLCBpbnNlcnQgYW4gZW1iZWQgY29kZSBpblxuICAgIC8vIEVkaXRvciBhbmQgbWFyayB0aGUgbW9kZWwgYXMgaW5zZXJ0ZWQuXG4gICAgdmFyIGVtYmVkQ29kZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmNyZWF0ZSgnd2lkZ2V0Jywge1xuICAgICAgdXVpZDogYnVmZmVySXRlbU1vZGVsLmdldCgnaWQnKSxcbiAgICAgIGNvbnRleHQ6IGl0ZW0udGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyksXG4gICAgfSk7XG4gICAgZW1iZWRDb2RlLnNldEF0dHJpYnV0ZSgnPHZpZXdtb2RlPicsICdlZGl0b3InKTtcbiAgICB0aGlzLl9hZGFwdGVyLmluc2VydEVtYmVkQ29kZShlbWJlZENvZGUpO1xuICB9XG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgdGhlIGxvZ2ljIGZvciBleGVjdXRpbmcgZWRpdG9yIGNvbW1hbmRzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIENvbW1hbmRFbWl0dGVyIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge1N5bmNBY3Rpb25EaXNwYXRjaGVyfSBkaXNwYXRjaGVyXG4gKiAgIFRoZSBhY3Rpb24gZGlzcGF0Y2hlciB0byB1c2UgZm9yIGRpc3BhdGNoaW5nIGNvbW1hbmRzLlxuICogQHBhcmFtIHtFZGl0b3JDb250ZXh0fSBlZGl0b3JDb250ZXh0XG4gKiAgIFRoZSBlZGl0b3IgY29udGV4dCB0byB1c2UgdG8gZ2V0IHN5bmMgc2V0dGluZ3MgZnJvbS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkaXNwYXRjaGVyLCBlZGl0b3JDb250ZXh0KSB7XG4gIHRoaXMuX2Rpc3BhdGNoZXIgPSBkaXNwYXRjaGVyO1xuICB0aGlzLl9lZGl0b3JDb250ZXh0ID0gZWRpdG9yQ29udGV4dDtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBFeGVjdXRlcyBhbiBcImluc2VydFwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIG5ldyBpdGVtIHdpbGwgYmUgaW5zZXJ0ZWQgaW50by5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogICBUaGUgdHlwZSB0byBpbnNlcnQuIFRoaXMgaXMgb3B0aW9uYWwuXG4gICAqL1xuICBpbnNlcnQ6IGZ1bmN0aW9uKHRhcmdldENvbnRleHRJZCwgdHlwZSkge1xuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgY29tbWFuZDogJ2luc2VydCcsXG4gICAgICB0YXJnZXRDb250ZXh0OiB0YXJnZXRDb250ZXh0SWQsXG4gICAgfTtcblxuICAgIGlmICh0eXBlKSB7XG4gICAgICBvcHRpb25zLnR5cGUgPSB0eXBlO1xuICAgIH1cblxuICAgIHRoaXMuX2V4ZWN1dGUoJ0lOU0VSVF9JVEVNJywgb3B0aW9ucyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIGFuIFwiZWRpdFwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIGJ1ZmZlciBpdGVtIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtSWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGJ1ZmZlciBpdGVtIHRvIGJlIGVkaXRlZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgb2YgaW5saW5lIGVkaXRzIHRvIGJlIHByZXNlcnZlZC4gU2VlIFdpZGdldE1vZGVsIGZvciB0aGUgZm9ybWF0IG9mXG4gICAqICAgaW5saW5lIGVkaXRzLlxuICAgKi9cbiAgZWRpdDogZnVuY3Rpb24odGFyZ2V0Q29udGV4dElkLCBpdGVtSWQsIGVkaXRzKSB7XG4gICAgdGhpcy5fZXhlY3V0ZSgnRURJVF9JVEVNJywge1xuICAgICAgY29tbWFuZDogJ2VkaXQnLFxuICAgICAgdGFyZ2V0Q29udGV4dDogdGFyZ2V0Q29udGV4dElkLFxuICAgICAgaXRlbUlkOiBpdGVtSWQsXG4gICAgICBlZGl0czogZWRpdHNcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRXhlY3V0ZXMgYSBcInJlbmRlclwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIGJ1ZmZlciBpdGVtIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtSWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGJ1ZmZlciBpdGVtIHRvIGJlIHJlbmRlcmVkLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZWRpdHNcbiAgICogICBBIG1hcCBvZiBpbmxpbmUgZWRpdHMgdG8gYmUgcHJlc2VydmVkLiBTZWUgV2lkZ2V0TW9kZWwgZm9yIHRoZSBmb3JtYXQgb2ZcbiAgICogICBpbmxpbmUgZWRpdHMuXG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKHRhcmdldENvbnRleHRJZCwgaXRlbUlkLCBlZGl0cykge1xuICAgIHRoaXMuX2V4ZWN1dGUoJ1JFTkRFUl9JVEVNJywge1xuICAgICAgY29tbWFuZDogJ3JlbmRlcicsXG4gICAgICB0YXJnZXRDb250ZXh0OiB0YXJnZXRDb250ZXh0SWQsXG4gICAgICBpdGVtSWQ6IGl0ZW1JZCxcbiAgICAgIGVkaXRzOiBlZGl0c1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBFeGVjdXRlcyBhbiBcImR1cGxpY2F0ZVwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIG5ldyBpdGVtIHdpbGwgYmUgaW5zZXJ0ZWQgaW50by5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUNvbnRleHRJZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgY29udGV4dCB0aGUgaXRlbSBiZWluZyBkdXBsaWNhdGVkIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtSWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGJ1ZmZlciBpdGVtIHRvIGJlIGR1cGxpY2F0ZWQuXG4gICAqIEBwYXJhbSB7bWl4ZWR9IHdpZGdldElkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdGhhdCB3aWxsIGJlIHVwZGF0ZWQgdG8gcmVmZXJlbmNlIHRoZSBuZXdseSBjcmVhdGVkXG4gICAqICAgaXRlbS5cbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgb2YgaW5saW5lIGVkaXRzIHRvIGJlIHByZXNlcnZlZC4gU2VlIFdpZGdldE1vZGVsIGZvciB0aGUgZm9ybWF0IG9mXG4gICAqICAgaW5saW5lIGVkaXRzLlxuICAgKi9cbiAgZHVwbGljYXRlOiBmdW5jdGlvbih0YXJnZXRDb250ZXh0SWQsIHNvdXJjZUNvbnRleHRJZCwgaXRlbUlkLCB3aWRnZXRJZCwgZWRpdHMpIHtcbiAgICB0aGlzLl9leGVjdXRlKCdEVVBMSUNBVEVfSVRFTScsIHtcbiAgICAgIGNvbW1hbmQ6ICdkdXBsaWNhdGUnLFxuICAgICAgdGFyZ2V0Q29udGV4dDogdGFyZ2V0Q29udGV4dElkLFxuICAgICAgc291cmNlQ29udGV4dDogc291cmNlQ29udGV4dElkLFxuICAgICAgaXRlbUlkOiBpdGVtSWQsXG4gICAgICB3aWRnZXQ6IHdpZGdldElkLFxuICAgICAgZWRpdHM6IGVkaXRzXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsIGNhbGxiYWNrIGZvciB0cmlnZ2VyaW5nIHRoZSBjb21tYW5kIHRvIGJlIHNlbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgVGhlIHR5cGUgb2YgY29tbWFuZCBiZWluZyBwZXJmb3JtZWQuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb21tYW5kXG4gICAqICAgVGhlIGNvbW1hbmQgZGF0YSB0byBiZSBwYXNzZWQgdG8gdGhlIGRpc3BhdGNoZWQuXG4gICAqL1xuICBfZXhlY3V0ZTogZnVuY3Rpb24odHlwZSwgY29tbWFuZCkge1xuICAgIGNvbW1hbmQuZWRpdG9yQ29udGV4dCA9IHRoaXMuX2VkaXRvckNvbnRleHQ7XG4gICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh0eXBlLCBjb21tYW5kLCB0aGlzLl9lZGl0b3JDb250ZXh0LmdldFNldHRpbmdzKCkpO1xuICB9XG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIHRoZSBsb2dpYyBmb3IgY3JlYXRpbmcgd2lkZ2V0IG1vZGVscy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBXaWRnZXRNb2RlbCA9IHJlcXVpcmUoJy4uLy4uL01vZGVscy9XaWRnZXRNb2RlbCcpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSB3aWRnZXQgZmFjdG9yeS5cbiAqXG4gKiBAcGFyYW0ge0NvbnRleHRSZXNvbHZlcn0gY29udGV4dFJlc29sdmVyXG4gKiAgIEEgY29udGV4dCByZXNvbHZlciB0byB1c2UgZm9yIHJlc29sdmluZyB0aGUgc291cmNlIGFuZCB0YXJnZXQgY29udGV4dHMgZm9yXG4gKiAgIGEgd2lkZ2V0LlxuICogQHBhcmFtIHtFZGl0QnVmZmVySXRlbVJlZkZhY3Rvcnl9IGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeVxuICogICBUaGUgZWRpdCBidWZmZXIgaXRlbSByZWZlcmVuY2UgZmFjdG9yeSB0byBwYXNzIHRocm91Z2ggdG8gY3JlYXRlZCB3aWRnZXRzLlxuICogQHBhcmFtIHtzdHJpbmd9IHV1aWRBdHRyaWJ1dGVOYW1lXG4gKiAgIFRoZSBuYW1lIG9mIHRoZSB1dWlkIGF0dHJpYnV0ZSBvbiB0aGUgd2lkZ2V0IGVsZW1lbnQgdG8gcHVsbCBlZGl0IGJ1ZmZlclxuICogICBpdGVtIGlkcyBmcm9tIHRoZSBET00uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGV4dFJlc29sdmVyLCBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnksIHV1aWRBdHRyaWJ1dGVOYW1lKSB7XG4gIHRoaXMuX2NvbnRleHRSZXNvbHZlciA9IGNvbnRleHRSZXNvbHZlcjtcbiAgdGhpcy5fZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5ID0gZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5O1xuICB0aGlzLl91dWlkQXR0cmlidXRlTmFtZSA9IHV1aWRBdHRyaWJ1dGVOYW1lO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgd2lkZ2V0IG1vZGVsIGJhc2VkIG9uIGRhdGEgcHJvdmlkZWQgYnkgdGhlIGVkaXRvci5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gd2lkZ2V0XG4gICAqICAgVGhpcyBpcyBhbnkgYXJiaXRyYXJ5IGRhdGEgdGhlIGVkaXRvciBpbXBsZW1lbnRhdGlvbiB3YW50cyB0byBhc3NvY2lhdGVcbiAgICogICB3aXRoIHRoZSB3aWRnZXQgbW9kZWwuIFRoaXMgbGV0cyB5b3UgYWNjZXNzIGVkaXRvci1zcGVjaWZpYyB3aWRnZXQgZGF0YVxuICAgKiAgIHN0cnVjdHVyZXMgZnJvbSB3aXRoaW4gdGhlIGVkaXRvciBhZGFwdGVyLlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIEEgdW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSB3aWRnZXQuIEluIG1vc3QgY2FzZXMsIGl0IG1ha2VzIHNlbnNlIHRvIHBhc3NcbiAgICogICB0aGlzIHRocm91Z2ggZGlyZWN0bHkgZnJvbSB0aGUgZmFjaWxpdHkgdGhhdCB0aGUgZWRpdG9yIHVzZWQgdG8gY3JlYXRlXG4gICAqICAgdGhlIHdpZGdldC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbFxuICAgKiAgIFRoZSB3aWRnZXQgZWxlbWVudC4gVGhpcyB3aWxsIGJlIHVzZWQgdG8gZGVyaXZlIHRoZSBjb250ZXh0IGJlaW5nXG4gICAqICAgaW5zZXJ0ZWQgaW50byAodGFyZ2V0Q29udGV4dCksIHRoZSBjb250ZXh0IHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyXG4gICAqICAgaXRlbSBjYW1lIGZyb20gKHNvdXJjZUNvbnRleHQpLCBhbmQgdGhlIHJlZmVyZW5jZWQgaXRlbSBpZC5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgVGhlIG5ld2x5IGNyZWF0ZWQgd2lkZ2V0IG1vZGVsLlxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbih3aWRnZXQsIGlkLCAkZWwpIHtcbiAgICB2YXIgc291cmNlQ29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5yZXNvbHZlU291cmNlQ29udGV4dCgkZWwpO1xuICAgIHZhciB0YXJnZXRDb250ZXh0ID0gdGhpcy5fY29udGV4dFJlc29sdmVyLnJlc29sdmVUYXJnZXRDb250ZXh0KCRlbCk7XG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeTogdGhpcy5fZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LFxuICAgICAgY29udGV4dFJlc29sdmVyOiB0aGlzLl9jb250ZXh0UmVzb2x2ZXIsXG4gICAgICB3aWRnZXQ6IHdpZGdldCxcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBXaWRnZXRNb2RlbCh7XG4gICAgICBpZDogaWQsXG4gICAgICBjb250ZXh0SWQ6IHRhcmdldENvbnRleHQuZ2V0KCdpZCcpLFxuICAgICAgaXRlbUlkOiAkZWwuYXR0cih0aGlzLl91dWlkQXR0cmlidXRlTmFtZSksXG4gICAgICBpdGVtQ29udGV4dElkOiBzb3VyY2VDb250ZXh0LmdldCgnaWQnKSxcbiAgICB9LCBvcHRpb25zKTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhIGNsYXNzIGZvciBzdG9yaW5nIHdpZGdldCB0cmFja2luZyBkYXRhLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgV2lkZ2V0TW9kZWwgPSByZXF1aXJlKCcuLi8uLi9Nb2RlbHMvV2lkZ2V0TW9kZWwnKSxcbiAgV2lkZ2V0Q29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uLy4uL0NvbGxlY3Rpb25zL1dpZGdldENvbGxlY3Rpb24nKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgV2lkZ2V0U3RvcmUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7RWRpdG9yQWRhcHRlcn0gYWRhcHRlclxuICogICBUaGUgZWRpdG9yIGFkYXB0ZXIgdGhhdCB3aWxsIGJlIHVzZWQgdG8gdGllIHRoZSBlZGl0b3Igd2lkZ2V0IHN0YXRlIHRvIHRoZVxuICogICBpbnRlcm5hbCB0cmFja2VkIHdpZGdldCBzdGF0ZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhZGFwdGVyKSB7XG4gIHRoaXMuX2FkYXB0ZXIgPSBhZGFwdGVyO1xuICB0aGlzLl92aWV3cyA9IHt9O1xuICB0aGlzLl93aWRnZXRDb2xsZWN0aW9uID0gbmV3IFdpZGdldENvbGxlY3Rpb24oKTtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwgQmFja2JvbmUuRXZlbnRzLCB7XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBtb2RlbCB0byB0aGUgd2lkZ2V0IHN0b3JlLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gd2lkZ2V0TW9kZWxcbiAgICogICBUaGUgd2lkZ2V0IG1vZGVsIHRvIGJlIHRyYWNrZWQsIG9yIGFuIGF0dHJpYnV0ZXMgb2JqZWN0IHRvIHVwZGF0ZSBhblxuICAgKiAgIGV4aXN0aW5nIG1vZGVsIHdpdGguIElmIGFuIGF0dHJpYnV0ZXMgb2JqZWN0IGlzIHByb3ZpZGVkLCBpdCBtdXN0IGhhdmUgYW5cbiAgICogICBpZCBhdHRyaWJ1dGUgYW5kIHRoZSBtb2RlIG11c3QgYWxyZWFkeSBiZSBpbiB0aGUgc3RvcmUuIE90aGVyd2lzZSBhblxuICAgKiAgIGVycm9yIHdpbGwgYmUgdGhyb3duLiBJZiBhIG1vZGVsIGlzIHByb3ZpZGVkIGFuZCBiZWxvbmdzIHRvIGEgY29sbGVjdGlvbixcbiAgICogICBpdCBtdXN0IGJlbG9uZyB0byB0aGUgd2lkZ2V0IHN0b3JlIGluc3RhbmNlIGNvbGxlY3Rpb24uIE90aGVyd2lzZSBhblxuICAgKiAgIGVycm9yIHdpbGwgYmUgdGhyb3duLlxuICAgKiBAcGFyYW0ge0JhY2tib25lLlZpZXd9IHdpZGdldFZpZXdcbiAgICogICBBbiBvcHRpb25hbCB2aWV3IGNvcnJlc3BvbmRpbmcgdG8gdGhlIHdpZGdldCdzIERPTSBlbGVtZW50LCBpZiBvbmVcbiAgICogICBleGlzdHMuIFRoaXMgd2lsbCBiZSB1c2VkIHRvIHRyYWNrIHdoZXRoZXIgdGhlIHdpZGdldCBpcyBwcmVzZW50IGluIHRoZVxuICAgKiAgIERPTSBhbmQgaWYgaXQgZ2V0cyBvcnBoYW5lZC5cbiAgICovXG4gIGFkZDogZnVuY3Rpb24od2lkZ2V0TW9kZWwsIHdpZGdldFZpZXcpIHtcbiAgICBpZiAoISh3aWRnZXRNb2RlbCBpbnN0YW5jZW9mIEJhY2tib25lLk1vZGVsKSkge1xuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSB3aWRnZXRNb2RlbDtcbiAgICAgIHdpZGdldE1vZGVsID0gdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbi5nZXQoYXR0cmlidXRlcy5pZCk7XG4gICAgICBpZiAoIXdpZGdldE1vZGVsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQXR0ZW1wdCB0byB1cGRhdGUgYW4gdW5rbm93biB3aWRnZXQuJyk7XG4gICAgICB9XG4gICAgICB3aWRnZXRNb2RlbC5zZXQoYXR0cmlidXRlcyk7XG4gICAgfVxuXG4gICAgaWYgKHdpZGdldE1vZGVsLmNvbGxlY3Rpb24pIHtcbiAgICAgIGlmICh3aWRnZXRNb2RlbC5jb2xsZWN0aW9uICE9PSB0aGlzLl93aWRnZXRDb2xsZWN0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIHdpZGdldCBiZWluZyBhZGRlZCBhbHJlYWR5IGJlbG9uZ3MgdG8gYW5vdGhlciBlZGl0b3IuJyk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Ubyh3aWRnZXRNb2RlbCwgJ2Rlc3Ryb3knLCB0aGlzLl9yZW1vdmVXcmFwcGVyKTtcbiAgICAgIHRoaXMubGlzdGVuVG8od2lkZ2V0TW9kZWwsICdjaGFuZ2U6aXRlbUlkJywgdGhpcy5fdXBkYXRlSXRlbVJlZmVyZW5jZSk7XG4gICAgICB0aGlzLl93aWRnZXRDb2xsZWN0aW9uLmFkZCh3aWRnZXRNb2RlbCk7XG4gICAgfVxuXG4gICAgaWYgKHdpZGdldFZpZXcpIHtcbiAgICAgIHZhciBpID0gd2lkZ2V0TW9kZWwuZ2V0KCdpdGVtSWQnKTtcbiAgICAgIHZhciBqID0gd2lkZ2V0TW9kZWwuZ2V0KCdpZCcpO1xuICAgICAgaWYgKCF0aGlzLl92aWV3c1tpXSkge1xuICAgICAgICB0aGlzLl92aWV3c1tpXSA9IHt9O1xuICAgICAgfVxuICAgICAgdGhpcy5fdmlld3NbaV1bal0gPSB3aWRnZXRWaWV3O1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogR2V0cyBhIHdpZGdldCBtb2RlbCwgdmlldyBwYWlyIGJhc2VkIG9uIGl0cyB3aWRnZXQgaWQuXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdG8gZ2V0LlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqICAgQW4gb2JqZWN0IHdpdGgga2V5cyAnbW9kZWwnIGFuZCAndmlldycsIHdoaWNoIGFyZSByZXNwZWN0aXZlbHkgdGhlIG1vZGVsXG4gICAqICAgYW5kIHZpZXcgb2JqZWN0cyBhc3NvY2lhdGVkIHdpdGggdGhlIHdpZGdldCBpZC4gSWYgZWl0aGVyIGNhbm5vdCBiZVxuICAgKiAgIGZvdW5kLCB0aGUgdmFsdWUgaW4gdGhlIHJlc3BlY3RpdmUga2V5IGlzIG51bGwuXG4gICAqL1xuICBnZXQ6IGZ1bmN0aW9uKGlkLCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgdmFyIHdpZGdldE1vZGVsID0gdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbi5nZXQoaWQpO1xuICAgIGlmICh3aWRnZXRNb2RlbCAmJiAhb3B0aW9ucy5yYXcpIHtcbiAgICAgIHZhciBpID0gd2lkZ2V0TW9kZWwuZ2V0KCdpdGVtSWQnKTtcbiAgICAgIHZhciBqID0gd2lkZ2V0TW9kZWwuZ2V0KCdpZCcpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbW9kZWw6IHdpZGdldE1vZGVsLFxuICAgICAgICB2aWV3OiB0aGlzLl9yZWFkQ2VsbChpLCBqKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1vZGVsOiB3aWRnZXRNb2RlbCxcbiAgICAgIHZpZXc6IG51bGxcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgbW9kZWwgZnJvbSB0aGUgc3RvcmUuXG4gICAqXG4gICAqIElmIHRoZSB3aWRnZXQgaGFzIG5vdCBhbHJlYWR5IGJlZW4gbWFya2VkIGFzIGRlc3Ryb3llZCBieSB0aGUgZWRpdG9yLCB0aGlzXG4gICAqIG1ldGhvZCB3aWxsIGFsc28gdHJpZ2dlciB3aWRnZXQgZGVzdHJ1Y3Rpb24gd2l0aGluIHRoZSBlZGl0b3IgdGhyb3VnaCB0aGVcbiAgICogZWRpdG9yIGFkYXB0ZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7V2lkZ2V0TW9kZWx9IHdpZGdldE1vZGVsXG4gICAqICAgVGhlIHdpZGdldCBtb2RlbCB0byBiZSByZW1vdmVkIGZyb20gdGhlIHN0b3JlLlxuICAgKiBAcGFyYW0ge2Jvb2x9IHNraXBEZXN0cm95XG4gICAqICAgQWxsb3dzIHRoZSBjbGllbnQgdG8gc3RvcCB0cmFja2luZyBhIHdpZGdldCB3aXRob3V0IGFjdHVhbGx5IHRyaWdnZXJpbmdcbiAgICogICB0aGUgZGVzdHJ1Y3Rpb24gb2YgdGhhdCB3aWRnZXQgd2l0aGluIHRoZSBlZGl0b3IuIFBhc3MgdHJ1ZSB0byBhdm9pZFxuICAgKiAgIGRlc3Ryb3lpbmcgdGhlIGVkaXRvciB3aWRnZXQuIEJ5IGRlZmF1bHQsIGNhbGxpbmcgdGhpcyBtZXRob2Qgd2lsbFxuICAgKiAgIHRyaWdnZXIgd2lkZ2V0IGRlc3RydWN0aW9uIHdpdGhpbiB0aGUgZWRpdG9yIGlmIGl0IGhhcyBub3QgYWxyZWFkeSBiZWVuXG4gICAqICAgZGVzdHJveWVkLlxuICAgKi9cbiAgcmVtb3ZlOiBmdW5jdGlvbih3aWRnZXRNb2RlbCwgc2tpcERlc3Ryb3kpIHtcbiAgICBpZiAoIXdpZGdldE1vZGVsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGkgPSB3aWRnZXRNb2RlbC5nZXQoJ2l0ZW1JZCcpO1xuICAgIHZhciBqID0gd2lkZ2V0TW9kZWwuZ2V0KCdpZCcpO1xuXG4gICAgLy8gSWYgdGhlIHdpZGdldCBoYXMgbm90IGFscmVhZHkgYmVlbiBkZXN0cm95ZWQgd2l0aGluIHRoZSBlZGl0b3IsIHRoZW5cbiAgICAvLyByZW1vdmluZyBpdCBoZXJlIHRyaWdnZXJzIGl0cyBkZXN0cnVjdGlvbi4gV2UgcHJvdmlkZSB0aGUgY2FsbGVyIHRoZVxuICAgIC8vIGFiaWxpdHkgdG8gc2lkZXN0ZXAgdGhpcyBzaWRlIGVmZmVjdCB3aXRoIHRoZSBza2lwRGVzdHJveSBvcHQtb3V0LlxuICAgIGlmICghd2lkZ2V0TW9kZWwuaGFzU3RhdGUoV2lkZ2V0TW9kZWwuU3RhdGUuREVTVFJPWUVEX1dJREdFVCkgJiYgIXNraXBEZXN0cm95KSB7XG4gICAgICB0aGlzLl9hZGFwdGVyLmRlc3Ryb3lXaWRnZXQod2lkZ2V0TW9kZWwuZ2V0KCdpZCcpKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBjdXJyZW50bHkgYSB2aWV3IGFzc29jYWl0ZWQgd2l0aCB0aGUgd2lkZ2V0LCB0aGVuIGRlc3Ryb3kgaXQuXG4gICAgaWYgKHRoaXMuX3ZpZXdzW2ldICYmIHRoaXMuX3ZpZXdzW2ldW2pdKSB7XG4gICAgICB2YXIgdmlldyA9IHRoaXMuX3ZpZXdzW2ldW2pdO1xuICAgICAgZGVsZXRlIHRoaXMuX3ZpZXdzW2ldW2pdO1xuICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdGhlIHdpZGdldCBmcm9tIHRoZSBpbnRlcm5hbCBjb2xsZWN0aW9uLCBwZXJmb3JtIG1lbW9yeSBjbGVhbnVwLFxuICAgIC8vIGFuZCBtYXJrIHRoZSB3aWRnZXQgbW9kZWwgYXMgbm8gbG9uZ2VyIGJlaW5nIHRyYWNrZWQuXG4gICAgdGhpcy5fY2xlYW5Sb3coaSk7XG4gICAgdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbi5yZW1vdmUod2lkZ2V0TW9kZWwpO1xuICAgIHdpZGdldE1vZGVsLnNldFN0YXRlKFdpZGdldE1vZGVsLlN0YXRlLkRFU1RST1lFRF9SRUZTKTtcbiAgfSxcblxuICAvKipcbiAgICogQ291bnRzIHRoZSBudW1iZXIgb2YgZGlmZmVyZW50IHdpZGdldHMgdGhhdCByZWZlcmVuY2UgdGhlIHNhbWUgYnVmZmVyIGl0ZW0uXG4gICAqXG4gICAqIEBwYXJhbSB7V2lkZ2V0TW9kZWx9IHdpZGdldE1vZGVsXG4gICAqICAgQSB3aWRnZXQgbW9kZWwgdG8gY291bnQgdGhlIGJ1ZmZlciBpdGVtIHJlZmVyZW5jZXMgZm9yLiBUaGlzIGZ1bmN0aW9uXG4gICAqICAgd2lsbCByZXR1cm4gdGhlIHRvdGFsIG51bWJlciBvZiB3aWRnZXRzIHRoYXQgcmVmZXJlbmNlIHRoZSBidWZmZXIgaXRlbVxuICAgKiAgIGdpdmVuIGJ5IHRoZSBpdGVtSWQgYXR0cmlidXRlIG9uIHRoZSB3aWRnZXQgbW9kZWwsIGluY2x1ZGluZyB0aGUgcGFzc2VkXG4gICAqICAgd2lkZ2V0IGl0ZXNlbGYuXG4gICAqXG4gICAqIEByZXR1cm4ge2ludH1cbiAgICogICBUaGUgbnVtYmVyIG9mIHdpZGdldHMgcmVmZXJlbmNpbmcgdGhlIGl0ZW0gc3BlY2lmaWVkIGJ5IHRoZSBwYXNzZWQgd2lkZ2V0XG4gICAqICAgbW9kZWwncyByZWZlcmVuY2VkIGl0ZW0uXG4gICAqL1xuICBjb3VudDogZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICB2YXIgY291bnQgPSAwO1xuXG4gICAgaWYgKHdpZGdldE1vZGVsKSB7XG4gICAgICB2YXIgaSA9IHdpZGdldE1vZGVsLmdldCgnaXRlbUlkJyk7XG4gICAgICBmb3IgKHZhciBqIGluIHRoaXMuX3ZpZXdzW2ldKSB7XG4gICAgICAgIGlmICh0aGlzLl9yZWFkQ2VsbChpLCBqKSkge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY291bnQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMuX3ZpZXdzKSB7XG4gICAgICBmb3IgKHZhciBqIGluIHRoaXMuX3ZpZXdzW2ldKSB7XG4gICAgICAgIHRoaXMuX3ZpZXdzW2ldW2pdLnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgZGVsZXRlIHRoaXMuX3ZpZXdzW2ldO1xuICAgIH1cbiAgICB0aGlzLl93aWRnZXRDb2xsZWN0aW9uLnJlc2V0KCk7XG4gICAgdGhpcy5fYWRhcHRlci5jbGVhbnVwKCk7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNhZmVseSByZXRyaWV2ZXMgYSB2aWV3IGZyb20gdGhlIHRhYmxlIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaVxuICAgKiAgIFRoZSByb3cgKGJ1ZmZlciBpdGVtIGlkKSBpbiB0aGUgdmlldyB0YWJsZSB0byByZWFkIGZyb20uXG4gICAqIEBwYXJhbSB7aW50fSBqXG4gICAqICAgVGhlIGNvbHVtbiAod2lkZ2V0IGlkKSBpbiB0aGUgdmlldyB0YWJsZSB0byByZWFkIGZyb20uXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLlZpZXd9XG4gICAqICAgQSB2aWV3IG9iamVjdCBpZiBvbmUgZXhpc3RzIGluIHRoZSB2aWV3IHRhYmxlIGl0IChpLGopLCBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIF9yZWFkQ2VsbDogZnVuY3Rpb24oaSwgaikge1xuICAgIHZhciB2aWV3ID0gbnVsbDtcblxuICAgIGlmICh0aGlzLl92aWV3c1tpXSAmJiB0aGlzLl92aWV3c1tpXVtqXSkge1xuICAgICAgdmlldyA9IHRoaXMuX3ZpZXdzW2ldW2pdO1xuICAgICAgaWYgKCF0aGlzLl9hZGFwdGVyLmdldFJvb3RFbCgpLmNvbnRhaW5zKHZpZXcuZWwpKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKHZpZXcubW9kZWwpO1xuICAgICAgICB2aWV3ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmlldztcbiAgfSxcblxuICAvKipcbiAgICogUmVjbGFpbXMgc3BhY2UgZnJvbSBhbiB1bnVzZWQgcm93LlxuICAgKlxuICAgKiBUaGlzIGlzIGNhbGxlZCBhZnRlciBwZXJmb3JtaW5nIGVudHJ5IHJlbW92YWxzIHRvIGRlbGV0ZSByb3dzIGluIHRoZSB2aWV3XG4gICAqIHRhYmxlIG9uY2UgdGhleSBiZWNvbWUgZW1wdHkuXG4gICAqXG4gICAqIEBwYXJhbSB7aW50fSBpXG4gICAqICAgVGhlIHJvdyBpbiB0aGUgdmlldyB0YWJsZSB0byBjaGVjayBmb3IgY2xlYW51cC4gSWYgdGhpcyByb3cgaXMgZW1wdHksIGl0XG4gICAqICAgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgX2NsZWFuUm93OiBmdW5jdGlvbihpKSB7XG4gICAgaWYgKHRoaXMuX3ZpZXdzW2ldICYmIF8uaXNFbXB0eSh0aGlzLl92aWV3c1tpXSkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl92aWV3c1tpXTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHdpZGdldCB0YWJsZSB3aGVuIGEgd2lkZ2V0J3MgcmVmZXJlbmNlZCBpdGVtIGhhcyBjaGFuZ2VkLlxuICAgKlxuICAgKiBUaGlzIGVuc3VyZXMgdGhhdCB3aGVuIGEgYnVmZmVyIGl0ZW0gaXMgZHVwbGljYXRlZCBmb3IgYSB3aWRnZXQsIGFuZCB0aGVcbiAgICogd2lkZ2V0IGdldHMgdXBkYXRlZCB0byBwb2ludCB0byB0aGUgbmV3IGl0ZW0sIHRoZSB2aWV3IHRhYmxlIGlzIHVwZGF0ZWQgdG9cbiAgICogcmVmbGVjdCB0aGUgY2hhbmdlLiBJbiBwYXJ0aWN1bGFyIHRoaXMgbWVhbnMgbW92aW5nIHRoZSBkYXRhIGZyb20gdGhlIG9sZFxuICAgKiB0YWJsZSBlbnRyeSB0byB0aGUgbmV3IHRhYmxlIGVudHJ5LlxuICAgKlxuICAgKiBAcGFyYW0ge1dpZGdldE1vZGVsfSB3aWRnZXRNb2RlbFxuICAgKiAgIFRoZSB3aWRnZXQgbW9kZWwgdGhhdCBoYXMgaGFkIGl0cyBpdGVtSWQgYXR0cmlidXRlIHVwZGF0ZWQuXG4gICAqL1xuICBfdXBkYXRlSXRlbVJlZmVyZW5jZTogZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICB2YXIgaSA9IHdpZGdldE1vZGVsLnByZXZpb3VzKCdpdGVtSWQnKTtcbiAgICB2YXIgaiA9IHdpZGdldE1vZGVsLmdldCgnaWQnKTtcbiAgICB2YXIgayA9IHdpZGdldE1vZGVsLmdldCgnaXRlbUlkJyk7XG5cbiAgICBpZiAodGhpcy5fdmlld3NbaV0gJiYgdGhpcy5fdmlld3NbaV1bal0pIHtcbiAgICAgIGlmICghdGhpcy5fdmlld3Nba10pIHtcbiAgICAgICAgdGhpcy5fdmlld3Nba10gPSB7fTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3ZpZXdzW2tdW2pdID0gdGhpcy5fdmlld3NbaV1bal07XG4gICAgICBkZWxldGUgdGhpcy5fdmlld3NbaV1bal07XG4gICAgfVxuXG4gICAgdGhpcy5fY2xlYW5Sb3coaSk7XG4gIH0sXG5cbiAgX3JlbW92ZVdyYXBwZXI6IGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgdGhpcy5yZW1vdmUod2lkZ2V0TW9kZWwpO1xuICB9XG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGEgY2xhc3MgZm9yIGdlbmVyYXRpbmcgd2lkZ2V0IHZpZXdzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIFdpZGdldFZpZXdGYWN0b3J5IG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnRGYWN0b3J5fSBlbGVtZW50RmFjdG9yeVxuICogICBUaGUgZWxlbWVudCBmYWN0b3J5IHRoYXQgd2lsbCBiZSBpbmplY3RlZCBpbnRvIGNyZWF0ZWQgdmlld3MuXG4gKiBAcGFyYW0ge0VkaXRvckFkYXB0ZXJ9IGFkYXB0ZXJcbiAqICAgVGhlIGVkaXRvciBhZGFwdGVyIHRoYXQgd2lsbCBiZSBpbmplY3RlZCBpbnRvIGNyZWF0ZWQgdmlld3MuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIGFkYXB0ZXIpIHtcbiAgdGhpcy5fZWxlbWVudEZhY3RvcnkgPSBlbGVtZW50RmFjdG9yeTtcbiAgdGhpcy5fYWRhcHRlciA9IGFkYXB0ZXI7XG4gIHRoaXMuX3ZpZXdNb2RlcyA9IFtdO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIHZpZXcgbW9kZS5cbiAgICpcbiAgICogVmlldyBtb2RlcyBjb3JyZXNwb25kIHRvIHNwZWNpZmljIHZpZXcgcHJvdG90eXBlcy4gVGhpcyBhbGxvd3Mgd2lkZ2V0cyB0b1xuICAgKiBiZSBkaXNwbGF5ZWQgaW4gZGlmZmVyZW50IGZvcm1zLiBGb3IgdGhlIHB1cnBvc2VzIG9mIHRoZSB3aWRnZXQtc3luY1xuICAgKiBsaWJyYXJ5LCB0aGlzIGdlbmVyYWxseSBtZWFucyB3ZSBoYXZlIG9uZSAnZWRpdG9yJyB2aWV3IG1vZGUgdGhhdCB0aGUgdXNlclxuICAgKiB3aWxsIGludGVyYWN0IHdpdGggaW4gdGhlIHd5c2l3eWcsIGFuZCBvbmUgb3IgbW9yZSAnZXhwb3J0JyB2aWV3IG1vZGUocylcbiAgICogdGhhdCB3aWxsIGJlIHVzZWQgdG8gdHJhbnNmb3JtIHVzZXIgaW5wdXQgaW50byBhIGZvcm1hdCB0aGF0IGlzIGVhc2llciB0b1xuICAgKiBzYXZlLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmlld01vZGVcbiAgICogICBUaGUgbmFtZSBvZiB0aGUgdmlldyBtb2RlIGJlaW5nIHJlZ2lzdGVyZWQuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAgICogICBUaGUgZGVmaW5pdGlvbiBvZiB0aGUgb2JqZWN0IGJlaW5nIHJlZ2lzdGVyZWQuIFNlZSBjb25maWcuanMgZm9yIGV4YW1wbGVzXG4gICAqICAgb2YgdGhlIGZvcm1hdCBvZiB0aGlzIG9iamVjdC4gQXQgbWluaW11bSwgZWFjaCBkZWZpbml0aW9uIG5lZWRzIGFcbiAgICogICAncHJvdG90eXBlJyBrZXkgdGhhdCBpcyBhIEJhY2tib25lLlZpZXcgZGVzY2VuZGVkIHR5cGUuXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICogICBUaGUgcGFzc2VkIGRlZml0aW9uIGlmIG5vIGVycm9ycyBvY2N1cnJlZC5cbiAgICovXG4gIHJlZ2lzdGVyOiBmdW5jdGlvbih2aWV3TW9kZSwgZGVmKSB7XG4gICAgaWYgKCFkZWYgfHwgIWRlZi5wcm90b3R5cGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVmlldyBtb2RlIHJlcXVpcmVzIGEgdmlldyBwcm90b3R5cGUuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3ZpZXdNb2Rlc1t2aWV3TW9kZV0gPSBkZWY7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSB2aWV3IGZvciBhIHdpZGdldCBtb2RlbC5cbiAgICpcbiAgICogQHBhcmFtIHtXaWRnZXRNb2RlbH0gd2lkZ2V0TW9kZWxcbiAgICogICBUaGUgd2lkZ2V0IG1vZGVsIHRvIGNyZWF0ZSB0aGUgdmlldyBmb3IuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxcbiAgICogICBBIGpRdWVyeSB3cmFwcGVkIGVsZW1lbnQgZm9yIHRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB0aGUgcm9vdCBvZiB0aGVcbiAgICogICB2aWV3LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmlld01vZGVcbiAgICogICBUaGUgdmlldyBtb2RlIHRvIGNyZWF0ZSBmb3IgdGhlIHdpZGdldC4gVGhpcyB3aWxsIGJlIHVzZWQgdG8gZGV0ZXJtaW5lXG4gICAqICAgd2hpY2ggdmlldyBwcm90b3R5cGUgaXMgdXNlZCB0byBpbnN0YW50aWF0ZSB0aGUgdmlldy4gdmlld01vZGUgbXVzdCBoYXZlXG4gICAqICAgcHJldmlvdXNseSBiZWVuIHJlZ2lzdGVyZWQgdGhyb3VnaCB0aGUgcmVnaXN0ZXIgbWV0aG9kLlxuICAgKlxuICAgKiBAcmV0dXJuIHtCYWNrYm9uZS5WaWV3fVxuICAgKiAgIFRoZSBuZXdseSBjcmVhdGVkIHZpZXcgb2JqZWN0LlxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbih3aWRnZXRNb2RlbCwgJGVsLCB2aWV3TW9kZSkge1xuICAgIGlmICghdmlld01vZGUpIHtcbiAgICAgIHZpZXdNb2RlID0gd2lkZ2V0TW9kZWwuZ2V0KCd2aWV3TW9kZScpO1xuICAgIH1cblxuICAgIHZhciBkZWYgPSB0aGlzLl92aWV3TW9kZXNbdmlld01vZGVdO1xuICAgIGlmICghZGVmKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdmlldyBtb2RlIFwiJyArIHZpZXdNb2RlICsgJ1wiJyk7XG4gICAgfVxuXG4gICAgdmFyIG9wdGlvbnMgPSBkZWYub3B0aW9ucyA/IGRlZi5vcHRpb25zIDoge307XG5cbiAgICByZXR1cm4gbmV3IGRlZi5wcm90b3R5cGUoXy5leHRlbmQoe1xuICAgICAgbW9kZWw6IHdpZGdldE1vZGVsLFxuICAgICAgYWRhcHRlcjogdGhpcy5fYWRhcHRlcixcbiAgICAgIGVsZW1lbnRGYWN0b3J5OiB0aGlzLl9lbGVtZW50RmFjdG9yeSxcbiAgICAgIGVsOiAkZWwuZ2V0KDApLFxuICAgIH0sIG9wdGlvbnMpKTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHZpZXcgZm9yIGEgd2lkZ2V0IG1vZGVsLCBhbmQgYmxvY2tzIGl0cyBldmVudCBoYW5kbGVycy5cbiAgICpcbiAgICogQnkgZGVmYXVsdCwgdmlld3MgYXJlIGNyZWF0ZWQgd2l0aCBhIGxvbmctdGVybSBsaWZlY3ljbGUgaW4gbWluZC4gVGhleVxuICAgKiBhdHRhY2ggdGhlbXNlbHZlcyB0byB0aGUgRE9NLCBsaXN0ZW4gZm9yIGNoYW5nZXMgdG8gdGhlIG1vZGVsLCBhbmQgdXBkYXRlXG4gICAqIHRoZSBET00uXG4gICAqXG4gICAqIEluIGNlcnRhaW4gY2FzZXMsIHdlIGRlc2lyZSB0byBjcmVhdGUgYSB2aWV3IHNpbXBseSB0byB1c2UgaXRzIG1hcmt1cFxuICAgKiBwcm9jZXNzaW5nIGxvZ2ljLiBXZSBkbyB0aGlzIGluIG9yZGVyIHRvIHRyYW5zZm9ybSBtYXJrdXAgaW50byBhcHBsaWNhdGlvblxuICAgKiBzdGF0ZS5cbiAgICpcbiAgICogSWYgd2Ugc2ltcGx5IHVzZSB0aGUgY3JlYXRlIG1ldGhvZCBpbiB0aGlzIGNhc2UsIHZpZXdzIGNhbiBwcmV2ZW50XG4gICAqIHRoZW1zZWx2ZXMgZnJvbSBiZWluZyBkZXN0cm95ZWQsIGFuZCBjYW4gY2F1c2UgdW53YW50ZWQgc2lkZS1lZmZlY3RzIGJ5XG4gICAqIGF0dGFjaGluZyB0aGVpciBvd24gbm90aWZpY2F0aW9uIGhhbmRsZXJzIHRvIHRoZSBtb2RlbC4gVG8gcHJldmVudCB0aGlzLCBcbiAgICogd2UgdXNlIHRoaXMgbWV0aG9kIHRvIGNyZWF0ZSBhIHNob3J0LXRlcm0gbGlmZWN5Y2xlIHZpZXcgdGhhdCBjYW4gYmVcbiAgICogZGlzY2FyZGVkIHdpdGhvdXQgc2lkZS1lZmZlY3RzLlxuICAgKlxuICAgKiBAcGFyYW0ge1dpZGdldE1vZGVsfSB3aWRnZXRNb2RlbFxuICAgKiAgIFRoZSB3aWRnZXQgbW9kZWwgdG8gY3JlYXRlIHRoZSB2aWV3IGZvci5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbFxuICAgKiAgIEEgalF1ZXJ5IHdyYXBwZWQgZWxlbWVudCBmb3IgdGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHRoZSByb290IG9mIHRoZVxuICAgKiAgIHZpZXcuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2aWV3TW9kZVxuICAgKiAgIFRoZSB2aWV3IG1vZGUgdG8gY3JlYXRlIGZvciB0aGUgd2lkZ2V0LiBUaGlzIHdpbGwgYmUgdXNlZCB0byBkZXRlcm1pbmVcbiAgICogICB3aGljaCB2aWV3IHByb3RvdHlwZSBpcyB1c2VkIHRvIGluc3RhbnRpYXRlIHRoZSB2aWV3LiB2aWV3TW9kZSBtdXN0IGhhdmVcbiAgICogICBwcmV2aW91c2x5IGJlZW4gcmVnaXN0ZXJlZCB0aHJvdWdoIHRoZSByZWdpc3RlciBtZXRob2QuXG4gICAqXG4gICAqIEByZXR1cm4ge0JhY2tib25lLlZpZXd9XG4gICAqICAgVGhlIG5ld2x5IGNyZWF0ZWQgdmlldyBvYmplY3QsIHdpdGggYWxsIGxpc3RlbmVycyByZW1vdmVkLlxuICAgKi9cbiAgY3JlYXRlVGVtcG9yYXJ5OiBmdW5jdGlvbih3aWRnZXRNb2RlbCwgJGVsLCB2aWV3TW9kZSkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZSh3aWRnZXRNb2RlbCwgJGVsLCB2aWV3TW9kZSkuc3RvcExpc3RlbmluZygpO1xuICB9XG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgdGhlIGxvZ2ljIGZvciBleGVjdXRpbmcgY29tbWFuZHMgZnJvbSB0aGUgcXVldWUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFnLCBhdHRyaWJ1dGVNYXAsIHNlbGVjdG9yLCBkYXRhKSB7XG4gIHZhciBlbGVtZW50ID0gdGhpcztcblxuICBpZiAoIWF0dHJpYnV0ZU1hcCkge1xuICAgIGF0dHJpYnV0ZU1hcCA9IHt9O1xuICB9XG5cbiAgdGhpcy5fdGFnID0gdGFnO1xuICB0aGlzLl9hdHRyaWJ1dGVNYXAgPSBhdHRyaWJ1dGVNYXA7XG4gIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG4gIHRoaXMuX2ludmVydGVkQXR0cmlidXRlTWFwID0ge307XG4gIF8uZWFjaChhdHRyaWJ1dGVNYXAsIGZ1bmN0aW9uKGF0dHJpYnV0ZV92YWx1ZSwgYXR0cmlidXRlX25hbWUpIHtcbiAgICBlbGVtZW50Ll9pbnZlcnRlZEF0dHJpYnV0ZU1hcFtlbGVtZW50Ll9nZXREYXRhS2V5KGF0dHJpYnV0ZV92YWx1ZSldID0gYXR0cmlidXRlX25hbWU7XG4gIH0pO1xuXG4gIGlmICghZGF0YSkge1xuICAgIGRhdGEgPSB7fTtcbiAgfVxuXG4gIHZhciBhdHRyaWJ1dGVzID0ge307XG4gIF8uZWFjaChhdHRyaWJ1dGVNYXAsIGZ1bmN0aW9uKGF0dHJpYnV0ZV92YWx1ZSwgYXR0cmlidXRlX25hbWUpIHtcbiAgICB2YXIgZGF0YUtleSA9IGVsZW1lbnQuX2dldERhdGFLZXkoYXR0cmlidXRlX3ZhbHVlKTtcbiAgICBpZiAoZGF0YUtleSkge1xuICAgICAgaWYgKGRhdGFbZGF0YUtleV0pIHtcbiAgICAgICAgYXR0cmlidXRlc1thdHRyaWJ1dGVfbmFtZV0gPSBkYXRhW2RhdGFLZXldO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGF0dHJpYnV0ZXNbYXR0cmlidXRlX25hbWVdID0gYXR0cmlidXRlX3ZhbHVlO1xuICAgIH1cbiAgfSk7XG5cbiAgdGhpcy5fYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXM7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICovXG4gIGdldFRhZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhZztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldEF0dHJpYnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9hdHRyaWJ1dGVzO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0QXR0cmlidXRlTmFtZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLmtleXModGhpcy5fYXR0cmlidXRlTWFwKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHNldEF0dHJpYnV0ZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLl9hdHRyaWJ1dGVzW3RoaXMuZ2V0QXR0cmlidXRlTmFtZShuYW1lKV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldEF0dHJpYnV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9hdHRyaWJ1dGVzW3RoaXMuZ2V0QXR0cmlidXRlTmFtZShuYW1lKV07XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRBdHRyaWJ1dGVOYW1lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGRhdGFLZXkgPSB0aGlzLl9nZXREYXRhS2V5KG5hbWUpO1xuICAgIGlmIChkYXRhS2V5ICYmIHRoaXMuX2ludmVydGVkQXR0cmlidXRlTWFwW2RhdGFLZXldKSB7XG4gICAgICBuYW1lID0gdGhpcy5faW52ZXJ0ZWRBdHRyaWJ1dGVNYXBbZGF0YUtleV07XG4gICAgfVxuICAgIHJldHVybiBuYW1lO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgcmVuZGVyT3BlbmluZ1RhZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3VsdCA9ICc8JyArIHRoaXMuZ2V0VGFnKCk7XG5cbiAgICBfLmVhY2godGhpcy5nZXRBdHRyaWJ1dGVzKCksIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICByZXN1bHQgKz0gJyAnICsgbmFtZSArICc9XCInICsgdmFsdWUgKyAnXCInO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArICc+JztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHJlbmRlckNsb3NpbmdUYWc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnPC8nICsgdGhpcy5nZXRUYWcoKSArICc+JztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldFNlbGVjdG9yOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXR0cmlidXRlcyA9IHRoaXMuZ2V0QXR0cmlidXRlcygpO1xuICAgIHZhciBzZWxlY3RvciA9ICcnO1xuXG4gICAgaWYgKHRoaXMuX3NlbGVjdG9yKSB7XG4gICAgICBzZWxlY3RvciA9IHRoaXMuX3NlbGVjdG9yO1xuICAgIH1cbiAgICBlbHNlIGlmIChhdHRyaWJ1dGVzWydjbGFzcyddKSB7XG4gICAgICB2YXIgY2xhc3NlcyA9IGF0dHJpYnV0ZXNbJ2NsYXNzJ10uc3BsaXQoJyAnKTtcbiAgICAgIF8uZWFjaChjbGFzc2VzLCBmdW5jdGlvbihjbGFzc25hbWUpIHtcbiAgICAgICAgc2VsZWN0b3IgKz0gJy4nICsgY2xhc3NuYW1lO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc2VsZWN0b3IgPSB0aGlzLmdldFRhZygpO1xuICAgIH1cblxuICAgIHJldHVybiBzZWxlY3RvcjtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIF9nZXREYXRhS2V5OiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHJlZ2V4ID0gL148KFthLXpcXC1dKyk+JC87XG4gICAgdmFyIHBhcnNlZCA9IHJlZ2V4LmV4ZWMobmFtZSk7XG4gICAgaWYgKHBhcnNlZCAmJiBwYXJzZWRbMV0pIHtcbiAgICAgIHJldHVybiBwYXJzZWRbMV07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIHRoZSBsb2dpYyBmb3IgZXhlY3V0aW5nIGNvbW1hbmRzIGZyb20gdGhlIHF1ZXVlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEVsZW1lbnQgPSByZXF1aXJlKCcuL0VsZW1lbnQnKTtcblxuLyoqXG4gKiBBIGZhY3RvcnkgZm9yIGNyZWF0aW5nIEVsZW1lbnQgb2JqZWN0cy5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZWxlbWVudHNcbiAqICAgRGVmaW5pdGlvbnMgb2YgZWxlbWVudCB0eXBlcyB0aGF0IGNhbiBiZSBjcmVhdGVkIGJ5IHRoaXMgZmFjdG9yeS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbGVtZW50cykge1xuICB0aGlzLl9lbGVtZW50cyA9IGVsZW1lbnRzO1xuXG4gIF8uZWFjaCh0aGlzLl9lbGVtZW50cywgZnVuY3Rpb24oZWxlbWVudCkge1xuICAgIGlmICghZWxlbWVudC5hdHRyaWJ1dGVzKSB7XG4gICAgICBlbGVtZW50LmF0dHJpYnV0ZXMgPSB7fTtcbiAgICB9XG4gIH0pO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gZWxlbWVudCBvYmplY3Qgd2l0aCBubyBkYXRhLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiAgIFRoZSB0eXBlIG9mIGVsZW1lbnQgdG8gZ2V0IGEgdGVtcGxhdGUgZm9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtFbGVtZW50fVxuICAgKiAgIFRoZSBjcmVhdGVkIGVsZW1lbnQgb2JqZWN0LCB3aXRoIG5vIGFkZGl0aW9uYWwgZGF0YS5cbiAgICovXG4gIGdldFRlbXBsYXRlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlKG5hbWUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVsZW1lbnQgaW5zdGFuY2Ugd2l0aCBzcGVjaWZpYyBkYXRhIGF0dHJpYnV0ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqICAgVGhlIHR5cGUgb2YgZWxlbWVudCB0byBjcmVhdGVkIGFzIGRlZmluZWQgaW4gdGhlIGNvbnN0cnVjdG9yLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YVxuICAgKiAgIFRoZSBkYXRhIHRvIHVzZSB0byBmaWxsIGluIHRoZSBlbGVtZW50IGF0dHJpYnV0ZXMgYmFzZWQgb24gdGhlIHR5cGVcbiAgICogICBkZWZpbml0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHtFbGVtZW50fVxuICAgKiAgIFRoZSBjcmVhdGVkIGVsZW1lbnQgb2JqZWN0LCB3aXRoIHRoZSBwYXNzZWQgYXR0cmlidXRlIGRhdGEgZmlsbGVkIGluLlxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG4gICAgdmFyIHRlbXBsYXRlID0gdGhpcy5fZWxlbWVudHNbbmFtZV07XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGVsZW1lbnQgdHlwZS4nKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBFbGVtZW50KHRlbXBsYXRlLnRhZywgdGVtcGxhdGUuYXR0cmlidXRlcywgdGVtcGxhdGUuc2VsZWN0b3IsIGRhdGEpO1xuICB9XG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYSBtb2RlbCBmb3IgcmVwcmVzZW50aW5nIGEgY29udGV4dC5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIEVkaXRCdWZmZXJJdGVtQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uL0NvbGxlY3Rpb25zL0VkaXRCdWZmZXJJdGVtQ29sbGVjdGlvbicpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG4gIHR5cGU6ICdDb250ZXh0JyxcblxuICBkZWZhdWx0czoge1xuICAgIHNjaGVtYUlkOiAnJyxcbiAgICBzZXR0aW5nczoge30sXG4gIH0sXG5cbiAgLyoqXG4gICAqIHtAaW5oZXJpdGRvY31cbiAgICovXG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgdGhpcy5lZGl0QnVmZmVyID0gbmV3IEVkaXRCdWZmZXJJdGVtQ29sbGVjdGlvbihbXSwgeyBjb250ZXh0SWQ6IGF0dHJpYnV0ZXMuaWQgfSk7XG4gICAgQmFja2JvbmUuTW9kZWwuYXBwbHkodGhpcywgW2F0dHJpYnV0ZXMsIG9wdGlvbnNdKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHNldDogZnVuY3Rpb24oYXR0cmlidXRlcywgb3B0aW9ucykge1xuICAgIGlmIChhdHRyaWJ1dGVzLmVkaXRCdWZmZXJJdGVtcykge1xuICAgICAgdGhpcy5lZGl0QnVmZmVyLmFkZChhdHRyaWJ1dGVzLmVkaXRCdWZmZXJJdGVtcywge21lcmdlOiB0cnVlfSk7XG4gICAgICBkZWxldGUgYXR0cmlidXRlcy5lZGl0QnVmZmVySXRlbXM7XG4gICAgfVxuXG4gICAgdmFyIG9sZElkID0gdGhpcy5nZXQoJ2lkJyk7XG4gICAgdmFyIG5ld0lkID0gYXR0cmlidXRlcy5pZDtcbiAgICBpZiAobmV3SWQgJiYgb2xkSWQgJiYgbmV3SWQgIT0gb2xkSWQpIHtcbiAgICAgIHZhciBjb2xsZWN0aW9uID0gdGhpcy5jb2xsZWN0aW9uO1xuICAgICAgaWYgKGNvbGxlY3Rpb24pIHtcbiAgICAgICAgY29sbGVjdGlvbi5yZW1vdmUodGhpcywgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgIHRoaXMuYXR0cmlidXRlcy5pZCA9IHRoaXMuaWQgPSBuZXdJZDtcbiAgICAgICAgY29sbGVjdGlvbi5hZGQodGhpcywgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgIHRoaXMuYXR0cmlidXRlcy5pZCA9IHRoaXMuaWQgPSBvbGRJZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgYXR0cmlidXRlcywgb3B0aW9ucyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRTZXR0aW5nczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KCdzZXR0aW5ncycpO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0U2V0dGluZzogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KCdzZXR0aW5ncycpW2tleV07XG4gIH0sXG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSBtb2RlbCBmb3IgcmVwcmVzZW50aW5nIGVkaXQgYnVmZmVyIGl0ZW1zLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuLyoqXG4gKiBCYWNrYm9uZSAgTW9kZWwgZm9yIHJlcHJlc2VudGluZyBjb21tYW5kcy5cbiAqXG4gKiBUaGUgaWQgZm9yIHRoaXMgbW9kZWwgaXMgdGhlIHV1aWQgb2YgYSBkYXRhIGVudGl0eSB0aGF0IHRoZSBpdGVtXG4gKiBjb3JyZXNwb25kcyB0by5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAYXVnbWVudHMgQmFja2JvbmUuTW9kZWxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG4gIHR5cGU6ICdFZGl0QnVmZmVySXRlbScsXG5cbiAgLyoqXG4gICAqIEB0eXBlIHtvYmplY3R9XG4gICAqXG4gICAqIEBwcm9wIG1hcmt1cFxuICAgKi9cbiAgZGVmYXVsdHM6IHtcblxuICAgICdjb250ZXh0SWQnOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgb3Igbm90IHRoZSBpdGVtIGlzIHJlYWR5IHRvIGJlIGluc2VydGVkLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICAnaW5zZXJ0JzogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaXRlbSBtYXJrdXAuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgICdtYXJrdXAnOiAnLi4uJyxcblxuICAgIC8qKlxuICAgICAqIFRoZSBpdGVtIG1hcmt1cC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgJ3R5cGUnOiAnJyxcblxuICAgICdmaWVsZHMnOiB7fVxuICB9LFxuXG59KTtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG4gIHR5cGU6ICdFZGl0b3InLFxuXG4gIC8qKlxuICAgKiB7QGluaGVyaXRkb2N9XG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbihhdHRyaWJ1dGVzLCBjb25maWcpIHtcbiAgICB0aGlzLndpZGdldEZhY3RvcnkgPSBjb25maWcud2lkZ2V0RmFjdG9yeTtcbiAgICB0aGlzLnZpZXdGYWN0b3J5ID0gY29uZmlnLnZpZXdGYWN0b3J5O1xuICAgIHRoaXMud2lkZ2V0U3RvcmUgPSBjb25maWcud2lkZ2V0U3RvcmU7XG4gICAgdGhpcy5lZGl0QnVmZmVyTWVkaWF0b3IgPSBjb25maWcuZWRpdEJ1ZmZlck1lZGlhdG9yO1xuICAgIHRoaXMuY29udGV4dCA9IGNvbmZpZy5jb250ZXh0O1xuICAgIHRoaXMuY29udGV4dFJlc29sdmVyID0gY29uZmlnLmNvbnRleHRSZXNvbHZlcjtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29udGV4dCwgJ2NoYW5nZTppZCcsIHRoaXMuX3VwZGF0ZUNvbnRleHRJZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBfdXBkYXRlQ29udGV4dElkOiBmdW5jdGlvbihjb250ZXh0TW9kZWwpIHtcbiAgICB0aGlzLnNldCh7IGlkOiBjb250ZXh0TW9kZWwuZ2V0KCdpZCcpIH0pO1xuICB9LFxuXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIHRoaXMud2lkZ2V0U3RvcmUuY2xlYW51cCgpO1xuICAgIHRoaXMuZWRpdEJ1ZmZlck1lZGlhdG9yLmNsZWFudXAoKTtcbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgbW9kZWwgZm9yIHJlcHJlc2VudGluZyBhIHNjaGVtYSBlbnRyeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICogQmFja2JvbmUgIE1vZGVsIGZvciByZXByZXNlbnRpbmcgYSBzY2hlbWEgZW50cnkuXG4gKlxuICogVGhlIGlkIGZvciB0aGlzIG1vZGVsIGlzIHRoZSB1dWlkIG9mIGEgZGF0YSBlbnRpdHkgdGhhdCB0aGUgaXRlbVxuICogY29ycmVzcG9uZHMgdG8uXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnU2NoZW1hJyxcblxuICAvKipcbiAgICogQHR5cGUge29iamVjdH1cbiAgICpcbiAgICogQHByb3AgbWFya3VwXG4gICAqL1xuICBkZWZhdWx0czoge1xuXG4gICAgJ2FsbG93ZWQnOiB7fSxcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGlzQWxsb3dlZDogZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiAhIXRoaXMuZ2V0KCdhbGxvd2VkJylbdHlwZV07XG4gIH0sXG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSBtb2RlbCBmb3IgcmVwcmVzZW50aW5nIGVkaXRvciB3aWRnZXRzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxudmFyIFN0YXRlID0ge1xuICBSRUFEWTogMHgwMSxcbiAgREVTVFJPWUVEX1dJREdFVDogMHgwMixcbiAgREVTVFJPWUVEX1JFRlM6IDB4MDQsXG4gIERFU1RST1lFRDogMHgwNixcbn07XG5cbi8qKlxuICogQmFja2JvbmUgIE1vZGVsIGZvciByZXByZXNlbnRpbmcgZWRpdG9yIHdpZGdldHMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnV2lkZ2V0JyxcblxuICAvKipcbiAgICogQHR5cGUge29iamVjdH1cbiAgICpcbiAgICogQHByb3AgbWFya3VwXG4gICAqL1xuICBkZWZhdWx0czoge1xuXG4gICAgLyoqXG4gICAgICogVGhlIGNvbnRleHQgdGhlIHdpZGdldCBpcyBpbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgY29udGV4dElkOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRvIGJlIHNlbnQgd2l0aCB0aGUgY29tbWFuZC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtpbnR9XG4gICAgICovXG4gICAgaXRlbUlkOiAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdG8gYmUgc2VudCB3aXRoIHRoZSBjb21tYW5kLlxuICAgICAqXG4gICAgICogQHR5cGUge2ludH1cbiAgICAgKi9cbiAgICBpdGVtQ29udGV4dElkOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFRoZSBpbnRlcm5hbCBtYXJrdXAgdG8gZGlzcGxheSBpbiB0aGUgd2lkZ2V0LlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBtYXJrdXA6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdG8gYmUgc2VudCB3aXRoIHRoZSBjb21tYW5kLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBlZGl0czoge30sXG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGUgcmVmZXJlbmNlZCBlZGl0IGJ1ZmZlciBpdGVtIGlzIGJlaW5nIGR1cGxpY2F0ZWQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7Ym9vbH1cbiAgICAgKi9cbiAgICBkdXBsaWNhdGluZzogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGVzdHJ1Y3Rpb24gc3RhdGUgZm9yIHRoZSB3aWRnZXQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7aW50fVxuICAgICAqL1xuICAgIHN0YXRlOiBTdGF0ZS5SRUFEWSxcbiAgfSxcblxuICAvKipcbiAgICoge0Bpbmhlcml0ZG9jfVxuICAgKi9cbiAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgdGhpcy53aWRnZXQgPSBvcHRpb25zLndpZGdldDtcbiAgICB0aGlzLl9lZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkgPSBvcHRpb25zLmVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeTtcbiAgICB0aGlzLl9jb250ZXh0UmVzb2x2ZXIgPSBvcHRpb25zLmNvbnRleHRSZXNvbHZlcjtcbiAgICBCYWNrYm9uZS5Nb2RlbC5hcHBseSh0aGlzLCBbYXR0cmlidXRlcywgb3B0aW9uc10pO1xuICB9LFxuXG4gIC8qKlxuICAgKiB7QGluaGVyaXRkb2N9XG4gICAqL1xuICBzZXQ6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMsIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9maWx0ZXJBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgIHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgYXR0cmlidXRlcywgb3B0aW9ucyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIGEgcmVxdWVzdCB0byBlZGl0IHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0uXG4gICAqL1xuICBlZGl0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVkaXRCdWZmZXJJdGVtUmVmLmVkaXQodGhpcy5nZXQoJ2VkaXRzJykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBhIHJlcXVlc3QgdG8gZHVwbGljYXRlIHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0uXG4gICAqL1xuICBkdXBsaWNhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0KHsgZHVwbGljYXRpbmc6IHRydWUgfSk7XG4gICAgdGhpcy5lZGl0QnVmZmVySXRlbVJlZi5kdXBsaWNhdGUodGhpcy5nZXQoJ2lkJyksIHRoaXMuZ2V0KCdlZGl0cycpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogVHJpZ2dlcnMgYSBjaGFpbiBvZiBldmVudHMgdG8gZGVsZXRlIC8gY2xlYW4gdXAgYWZ0ZXIgdGhpcyB3aWRnZXQuXG4gICAqL1xuICBkZXN0cm95OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgLy8gSWYgdGhlIHdpZGdldCBoYXMgbm90IGFscmVhZHkgYmVlbiBtYXJrZWQgYXMgZGVzdHJveWVkIHdlIHRyaWdnZXIgYVxuICAgIC8vIGRlc3Ryb3kgZXZlbnQgb24gdGhlIHdpZGdldCBjb2xsZWN0aW9uIHNvIGl0IGNhbiBpbnN0cnVjdCBhbnl0aGluZyB0aGF0XG4gICAgLy8gcmVmZXJlbmNlcyB0aGlzIHdpZGdldCB0byBjbGVhbiBpdCBvdXQuIFJlZHVuZGFudCBkZXN0cm95IGNhbGxzIGFyZVxuICAgIC8vIGlnbm9yZWQuXG4gICAgaWYgKCF0aGlzLmhhc1N0YXRlKFN0YXRlLkRFU1RST1lFRCkpIHtcbiAgICAgIHRoaXMudHJpZ2dlcignZGVzdHJveScsIHRoaXMsIHRoaXMuY29sbGVjdGlvbiwgb3B0aW9ucyk7XG4gICAgICB0aGlzLnNldFN0YXRlKFN0YXRlLkRFU1RST1lFRCk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBkZXN0cnVjdGlvbiBzdGF0ZSBmb3IgdGhpcyB3aWRnZXQuXG4gICAqL1xuICBzZXRTdGF0ZTogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICByZXR1cm4gdGhpcy5zZXQoe3N0YXRlOiB0aGlzLmdldCgnc3RhdGUnKSB8IHN0YXRlfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgZGVzdHJ1Y3Rpb24gc3RhdGUgZm9yIHRoaXMgd2lkZ2V0LlxuICAgKi9cbiAgaGFzU3RhdGU6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgcmV0dXJuICh0aGlzLmdldCgnc3RhdGUnKSAmIHN0YXRlKSA9PT0gc3RhdGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBfZmlsdGVyQXR0cmlidXRlczogZnVuY3Rpb24oYXR0cmlidXRlcykge1xuICAgIC8vIFJ1biB0aGUgY2hhbmdlIGhhbmRsZXIgdG8gcmVidWlsZCBhbnkgcmVmZXJlbmNlcyB0byBleHRlcm5hbCBtb2RlbHNcbiAgICAvLyBpZiBuZWNlc3NhcnkuIFdlIGRvIHRoaXMgaGVyZSBpbnN0ZWFkIG9mIG9uKCdjaGFuZ2UnKSB0byBlbnN1cmUgdGhhdFxuICAgIC8vIHN1YnNjcmliZWQgZXh0ZXJuYWwgbGlzdGVuZXJzIGdldCBjb25zaXN0ZW50IGF0b21pYyBjaGFuZ2VcbiAgICAvLyBub3RpZmljYXRpb25zLlxuICAgIGlmICh0aGlzLl9yZWZyZXNoRWRpdEJ1ZmZlckl0ZW1SZWYoYXR0cmlidXRlcykgfHwgYXR0cmlidXRlcy5lZGl0cykge1xuICAgICAgdGhpcy5fc2V0dXBMaXN0ZW5lcnMoYXR0cmlidXRlcyk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBmdW5jdGlvbiB0byBoYW5kbGUgY2hhbmdlcyB0byB0aGUgcmVmZXJlbmNlZCBlZGl0IGJ1ZmZlciBpdGVtLlxuICAgKi9cbiAgX3JlZnJlc2hFZGl0QnVmZmVySXRlbVJlZjogZnVuY3Rpb24oYXR0cmlidXRlcykge1xuICAgIC8vIFRyYWNrIHdoZXRoZXIgd2UgbmVlZCB0byB1cGRhdGUgd2hpY2ggcmVmZXJlbmNlZCBtb2RlbHMgd2UgYXJlXG4gICAgLy8gbGlzdGVuaW5nIHRvLlxuICAgIHZhciBzZXR1cExpc3RlbmVycyA9IGZhbHNlO1xuXG4gICAgLy8gR2V0IHRoZSBjb25zb2xpZGF0ZWQgbGlzdCBvZiBvbGQgLyB1cGRhdGVkIHByb3BlcnRpZXMgdG8gY2hlY2sgZm9yXG4gICAgLy8gY2hhbmdlcy5cbiAgICB2YXIgb2xkSXRlbUNvbnRleHQgPSB0aGlzLmdldCgnaXRlbUNvbnRleHRJZCcpO1xuICAgIHZhciBvbGRXaWRnZXRDb250ZXh0ID0gdGhpcy5nZXQoJ2NvbnRleHRJZCcpO1xuICAgIHZhciBvbGRJdGVtSWQgPSB0aGlzLmdldCgnaXRlbUlkJyk7XG4gICAgdmFyIG5ld0l0ZW1Db250ZXh0ID0gYXR0cmlidXRlcy5pdGVtQ29udGV4dElkID8gYXR0cmlidXRlcy5pdGVtQ29udGV4dElkIDogb2xkSXRlbUNvbnRleHQ7XG4gICAgdmFyIG5ld1dpZGdldENvbnRleHQgPSBhdHRyaWJ1dGVzLmNvbnRleHRJZCA/IGF0dHJpYnV0ZXMuY29udGV4dElkIDogb2xkV2lkZ2V0Q29udGV4dDtcbiAgICB2YXIgbmV3SXRlbUlkID0gYXR0cmlidXRlcy5pdGVtSWQgPyBhdHRyaWJ1dGVzLml0ZW1JZCA6IG9sZEl0ZW1JZDtcblxuICAgIC8vIElmIHRoZSBjb250ZXh0IHRoZSBidWZmZXIgaXRlbSBoYXMgY2hhbmdlZCwgdGhlIGNvbnRleHQgb2YgdGhlIHdpZGdldFxuICAgIC8vIGhhcyBjaGFuZ2VkLCBvciB0aGUgcmVmZXJlbmNlZCBlZGl0IGJ1ZmZlciBpdGVtIGlkIGhhcyBjaGFuZ2VkIHdlIG5lZWRcbiAgICAvLyB0byByZWdlbmVyYXRlIHRoZSBlZGl0IGJ1ZmZlciBpdGVtIHJlZmVyZW5jZSBhbmQgaW5zdHJ1Y3QgdGhlIGNhbGxlciB0b1xuICAgIC8vIHVwZGF0ZSB0aGUgbW9kZWxzIHRoaXMgd2lkZ2V0IGlzIGxpc3RlbmluZyB0by5cbiAgICBpZiAobmV3SXRlbUNvbnRleHQgIT0gb2xkSXRlbUNvbnRleHQgfHwgbmV3V2lkZ2V0Q29udGV4dCAhPSBvbGRXaWRnZXRDb250ZXh0IHx8IG5ld0l0ZW1JZCAhPSBvbGRJdGVtSWQpIHtcbiAgICAgIHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYgPSB0aGlzLl9lZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkuY3JlYXRlRnJvbUlkcyhuZXdJdGVtSWQsIG5ld0l0ZW1Db250ZXh0LCBuZXdXaWRnZXRDb250ZXh0KTtcbiAgICAgIHNldHVwTGlzdGVuZXJzID0gdHJ1ZTtcbiAgICAgIGF0dHJpYnV0ZXMubWFya3VwID0gdGhpcy5lZGl0QnVmZmVySXRlbVJlZi5lZGl0QnVmZmVySXRlbS5nZXQoJ21hcmt1cCcpO1xuICAgIH1cblxuICAgIHJldHVybiBzZXR1cExpc3RlbmVycztcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyBhbnkgc3RhbGUgbGlzdGVuZXJzIGFuZCBzZXRzIHVwIGZyZXNoIGxpc3RlbmVycy5cbiAgICovXG4gIF9zZXR1cExpc3RlbmVyczogZnVuY3Rpb24oYXR0cmlidXRlcykge1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpXG4gICAgICAubGlzdGVuVG8odGhpcy5lZGl0QnVmZmVySXRlbVJlZi5lZGl0QnVmZmVySXRlbSwgJ2NoYW5nZTptYXJrdXAnLCB0aGlzLl9yZWFkRnJvbUJ1ZmZlckl0ZW0pXG4gICAgICAubGlzdGVuVG8odGhpcy5lZGl0QnVmZmVySXRlbVJlZi5zb3VyY2VDb250ZXh0LCAnY2hhbmdlOmlkJywgdGhpcy5fdXBkYXRlQ29udGV4dClcbiAgICAgIC5saXN0ZW5Ubyh0aGlzLmVkaXRCdWZmZXJJdGVtUmVmLnRhcmdldENvbnRleHQsICdjaGFuZ2U6aWQnLCB0aGlzLl91cGRhdGVDb250ZXh0KTtcblxuICAgIF8uZWFjaChhdHRyaWJ1dGVzLmVkaXRzLCBmdW5jdGlvbih2YWx1ZSwgY29udGV4dFN0cmluZykge1xuICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLl9jb250ZXh0UmVzb2x2ZXIuZ2V0KGNvbnRleHRTdHJpbmcpO1xuICAgICAgdGhpcy5saXN0ZW5Ubyhjb250ZXh0LCAnY2hhbmdlOmlkJywgdGhpcy5fdXBkYXRlQ29udGV4dCk7XG4gICAgfSwgdGhpcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsIGZ1bmN0aW9uIHRvIGNvcHkgdXBkYXRlcyBmcm9tIHRoZSByZWZlcmVuY2VkIGJ1ZmZlciBpdGVtLlxuICAgKi9cbiAgX3JlYWRGcm9tQnVmZmVySXRlbTogZnVuY3Rpb24oYnVmZmVySXRlbU1vZGVsKSB7XG4gICAgdGhpcy5zZXQoe21hcmt1cDogYnVmZmVySXRlbU1vZGVsLmdldCgnbWFya3VwJyl9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW50ZXJuYWwgZnVuY3Rpb24gdG8gaGFuZGxlIHdoZW4gYSByZWZlcmVuY2VkIGNvbnRleHQgaWQgaGFzIGNoYW5nZWQuXG4gICAqL1xuICBfdXBkYXRlQ29udGV4dDogZnVuY3Rpb24oY29udGV4dE1vZGVsKSB7XG4gICAgdmFyIG9sZElkID0gY29udGV4dE1vZGVsLnByZXZpb3VzKCdpZCcpO1xuICAgIHZhciBuZXdJZCA9IGNvbnRleHRNb2RlbC5nZXQoJ2lkJyk7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSB7fTtcblxuICAgIC8vIFVwZGF0ZSBhbnkgY29udGV4dCBpZCByZWZlcmVuY2VzIHRoYXQgbWF5IG5lZWQgdG8gY2hhbmdlLlxuICAgIGlmICh0aGlzLmdldCgnaXRlbUNvbnRleHRJZCcpID09IG9sZElkKSB7XG4gICAgICBhdHRyaWJ1dGVzLml0ZW1Db250ZXh0SWQgPSBuZXdJZDtcbiAgICB9XG4gICAgaWYgKHRoaXMuZ2V0KCdjb250ZXh0SWQnKSA9PSBvbGRJZCkge1xuICAgICAgYXR0cmlidXRlcy5jb250ZXh0SWQgPSBuZXdJZDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgY29udGV4dCB3YXMgcmVmZXJlbmNlZCBieSBhbiBlZGl0IG9uIHRoZSBtb2RlbCwgdXBkYXRlIHRoZSBlZGl0LlxuICAgIHZhciBlZGl0cyA9IHRoaXMuZ2V0KCdlZGl0cycpO1xuICAgIGlmIChlZGl0c1tvbGRJZF0pIHtcbiAgICAgIGF0dHJpYnV0ZXMuZWRpdHMgPSB7fTtcbiAgICAgIF8uZWFjaChlZGl0cywgZnVuY3Rpb24odmFsdWUsIGNvbnRleHRTdHJpbmcpIHtcbiAgICAgICAgaWYgKGNvbnRleHRTdHJpbmcgPT0gb2xkSWQpIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzLmVkaXRzW25ld0lkXSA9IHZhbHVlLnJlcGxhY2Uob2xkSWQsIG5ld0lkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzLmVkaXRzW2NvbnRleHRTdHJpbmddID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0KGF0dHJpYnV0ZXMpO1xuICAgIHRoaXMudHJpZ2dlcigncmViYXNlJywgdGhpcywgb2xkSWQsIG5ld0lkKTtcbiAgfSxcblxufSk7XG5cbm1vZHVsZS5leHBvcnRzLlN0YXRlID0gU3RhdGU7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBjb21tYW5kcyBmcm9tIHRoZSBxdWV1ZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICogTWFya3MgYSBtZXRob2QgYXMgYW4gaW50ZXJmYWNlIHN0dWIuXG4gKi9cbmZ1bmN0aW9uIHVuaW1wbGVtZW50ZWQoKSB7XG4gIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCBtZXRob2QuJyk7XG59XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEluc2VydHMgYW4gZW1iZWQgY29kZSBpbnRvIHRoZSBlZGl0b3IuXG4gICAqXG4gICAqIFRoaXMgc2hvdWxkIGluc2VydCB0aGUgbmV3bHkgY3JlYXRlZCBlbGVtZW50IGF0IHRoZSBjdXJyZW50IGVkaXRhYmxlIGN1cnNvclxuICAgKiBwb3NpdGlvbiB3aXRoaW4gdGhlIGVkaXRvci5cbiAgICpcbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbWJlZENvZGVcbiAgICogICBUaGUgZW1iZWQgY29kZSBlbGVtZW50IHRvIGJlIGluc2VydGVkLlxuICAgKi9cbiAgaW5zZXJ0RW1iZWRDb2RlOiBmdW5jdGlvbihlbWJlZENvZGUpIHtcbiAgICB1bmltcGxlbWVudGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSB3aWRnZXQgZnJvbSB0aGUgZWRpdG9yLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCByZW1vdmUgdGhlIHdpZGdldCBiYXNlZCBvbiBpdHMgdW5pcXVlIGlkIGFuZCBmcmVlIGFueVxuICAgKiBhc3NvY2lhdGVkIG1lbW9yeS5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdG8gYmUgZGVzdHJveWVkLlxuICAgKi9cbiAgZGVzdHJveVdpZGdldDogZnVuY3Rpb24oaWQpIHtcbiAgICB1bmltcGxlbWVudGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldHMgdXAgYW4gaW5saW5lIGVkaXRhYmxlIGZpZWxkIHdpdGhpbiBhIHdpZGdldC5cbiAgICpcbiAgICogVGhlIHdpZGdldFZpZXcgcGFyYW1ldGVyIGdpdmVzIHRoZSBhZGFwdGVyIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgdGhhdFxuICAgKiBzaG91bGQgYmUgaW5saW5lLWVkaXRhYmxlLiBUaGUgY29udGV4dElkIGFsbG93cyBhY2Nlc3MgdG8gdGhlIGN1cnJlbnRcbiAgICogaW5saW5lIGVkaXRzIGZvciB0aGUgcGFydGljdWxhciBjb250ZXh0LCBhbmQgdGhlIHNlbGVjdG9yIGlzIGEgalF1ZXJ5IHN0eWxlXG4gICAqIHNlbGVjdG9yIGRpY3RhdGluZyB3aGljaCBub2RlIGluIHRoZSB3aWRnZXRWaWV3IERPTSB3aWxsIGJlY29tZVxuICAgKiBpbmxpbmUtZWRpdGFibGUuXG4gICAqXG4gICAqIEBwYXJhbSB7QmFja2JvbmUuVmlld30gd2lkZ2V0Vmlld1xuICAgKiAgIFRoZSB2aWV3IGZvciB0aGUgd2lkZ2V0IHRoYXQgY29udGFpbnMgdGhlIGZpZWxkIHRoYXQgd2lsbCBiZWNvbWVcbiAgICogICBlZGl0YWJsZS5cbiAgICogQHBhcmFtIHttaXhlZH0gY29udGV4dElkXG4gICAqICAgVGhlIGNvbnRleHQgaWQgdG8gb2YgdGhlIGZpZWxkIHRoYXQgc2hvdWxkIGJlY29tZSBpbmxpbmUgZWRpdGFibGUuIEVhY2hcbiAgICogICBlZGl0YWJsZSBmaWVsZCBkZWZpbmVzIGEgdW5pcXVlIGNvbnRleHQgZm9yIGl0cyBjaGlsZHJlbi5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yXG4gICAqICAgQSBqUXVlcnkgc3R5bGUgc2VsZWN0b3IgZm9yIHNwZWNpZnlpbmcgd2hpY2ggZWxlbWVudCB3aXRoaW4gdGhlIHdpZGdldFxuICAgKiAgIHNob3VsZCBiZWNvbWUgZWRpdGFibGUuIFRoZSBzZWxlY3RvciBpcyByZWxhdGl2ZSB0byB0aGUgdmlldydzIHJvb3QgZWxcbiAgICogICBwcm9wZXJ0eS5cbiAgICovXG4gIGF0dGFjaElubGluZUVkaXRpbmc6IGZ1bmN0aW9uKHdpZGdldFZpZXcsIGNvbnRleHRJZCwgc2VsZWN0b3IpIHtcbiAgICB1bmltcGxlbWVudGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlYWRzIHRoZSBpbmxpbmUgZWRpdCBmb3IgYW4gZWRpdGFibGUgd2lkZ2V0IGZpZWxkIGZyb20gdGhlIHdpZGdldCdzIERPTS5cbiAgICpcbiAgICogQHBhcmFtIHtCYWNrYm9uZS5WaWV3fSB3aWRnZXRWaWV3XG4gICAqICAgVGhlIHZpZXcgZm9yIHRoZSB3aWRnZXQgdGhhdCBjb250YWlucyB0aGUgZmllbGQgdG8gcmVhZCBpbmxpbmUgZWRpdHNcbiAgICogICBmcm9tLlxuICAgKiBAcGFyYW0ge21peGVkfSBjb250ZXh0SWRcbiAgICogICBUaGUgY29udGV4dCBpZCB0byByZWFkIHRoZSBpbmxpbmUgZWRpdCBmcm9tLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3JcbiAgICogICBBIGpRdWVyeSBzdHlsZSBzZWxlY3RvciBmb3Igc3BlY2lmeWluZyB3aGljaCBlbGVtZW50IHdpdGhpbiB0aGUgd2lkZ2V0XG4gICAqICAgc2hvdWxkIHRoZSBpbmxpbmUgZWRpdHMgc2hvdWxkIGJlIHJlYWQgZnJvbS4gVGhlIHNlbGVjdG9yIGlzIHJlbGF0aXZlIHRvXG4gICAqICAgdGhlIHZpZXcncyByb290IGVsIHByb3BlcnR5LlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqICAgVGhlIHByb2Nlc3NlZCBpbmxpbmUgZWRpdCBtYXJrdXAgZm9yIHRoZSBzcGVjaWZpZWQgY29udGV4dElkLlxuICAgKi9cbiAgZ2V0SW5saW5lRWRpdDogZnVuY3Rpb24od2lkZ2V0VmlldywgY29udGV4dElkLCBzZWxlY3Rvcikge1xuICAgIHJldHVybiB1bmltcGxlbWVudGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHJvb3QgRE9NIGVsZW1lbnQgZm9yIHRoZSBlZGl0b3IuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHRlbGxzIHRoZSBlZGl0b3IgaG93IHRvIFxuICAgKlxuICAgKiBAcmV0dXJuIHtET01FbGVtZW50fVxuICAgKiAgIFRoZSByb290IERPTSBlbGVtZW50IGZvciB0aGUgZWRpdG9yLlxuICAgKi9cbiAgZ2V0Um9vdEVsOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdW5pbXBsZW1lbnRlZCgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbiBvcHRpb25hbCBtZXRob2QgZm9yIHBlcmZvcm1pbmcgYW55IGNsZWFudXAgYWZ0ZXIgdHJhY2tlciBkZXN0cnVjdGlvbi5cbiAgICpcbiAgICogVGhpcyB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSB3aWRnZXQgdHJhY2tlciBoYXMgYmVlbiBkZXN0cm95ZWQuIEl0IGlzXG4gICAqIHVzdWFsbHkgbm90IG5lY2Vzc2FyeSB0byBpbXBsZW1lbnQgdGhpcyBtZXRob2QuXG4gICAqL1xuICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMuZXh0ZW5kID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYW4gaW50ZXJmYWNlIGZvciBwcm90b2NvbCBwbHVnaW5zLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuLyoqXG4gKiBBIGJhc2UgZm9yIHByb3RvY29sIHBsdWdpbnMuXG4gKlxuICogUHJvdG9jb2wgcGx1Z2lucyBoYW5kbGUgdGhlIHJlcXVlc3QgLyByZXNwb25zZSBtZWNoYW5pc20gZm9yIHN5bmNpbmcgZGF0YSB0b1xuICogYW5kIGZyb20gdGhlIHNlcnZlci4gVGhleSBwcm92aWRlIGEgc2luZ2xlIG1ldGhvZCAnc2VuZCcgdGhhdCB3aWxsIGJlIGNhbGxlZFxuICogd2hlbiByZXF1ZXN0cyBhcmUgZGlzcGF0Y2hlZC5cbiAqXG4gKiBUaGUgY29tbWFuZCByZXNvbHZlciBpcyB1c2VkIHRvIHBhc3MgdGhlIHJlc3BvbnNlIGJhY2sgaW50byB0aGUgdHJhY2tpbmdcbiAqIHN5c3RlbSBhc3luY2hyb25vdXNseS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBTZW5kcyBhIHJlcXVlc3QgdG8gdGhlIGRhdGEgc3RvcmUuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHNob3VsZCBpbml0aWF0ZSBhIHJlcXVlc3QsIHRoZW4gY2FsbCByZXNvbHZlci5yZXNvbHZlKGRhdGEpXG4gICAqIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgKiBcbiAgICogVGhlIGRhdGEgb2JqZWN0IHBhc3NlZCB0byByZXNvbHZlKCkgbWF5IGNvbnRhaW4gb25lIG9yIG1vcmUgb2Y6ICdjb250ZXh0JyxcbiAgICogJ3dpZGdldCcsICdlZGl0QnVmZmVySXRlbScsICdzY2hlbWEnLiBFYWNoIGVudHJ5IHNob3VsZCBiZSBhIGRhdGEgbW9kZWxcbiAgICoga2V5ZWQgYnkgdGhlIGlkIG9mIHRoZSBkYXRhIG1vZGVsLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgKiAgIFRoZSByZXF1ZXN0IHR5cGUuIFRoaXMgY2FuIGJlIG9uZSBvZjogJ0lOU0VSVF9JVEVNJywgJ1JFTkRFUl9JVEVNJyxcbiAgICogICAnRFVQTElDQVRFX0lURU0nLCAnRkVUQ0hfU0NIRU1BJy5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGFcbiAgICogICBUaGUgZGF0YSB0byBiZSBzZW50IGluIHRoZSByZXF1ZXN0LlxuICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3NcbiAgICogICBOb24tY29tbWFuZCBzcGVjaWZpYyBjb250ZXh0IHNldHRpbmdzLlxuICAgKiBAcGFyYW0ge1N5bmNBY3Rpb25SZXNvbHZlcn0gcmVzb2x2ZXJcbiAgICogICBUaGUgcmVzb2x2ZXIgc2VydmljZSB0aGF0IHdpbGwgYmUgdXNlZCB0byByZXNvbHZlIHRoZSBjb21tYW5kLlxuICAgKi9cbiAgc2VuZDogZnVuY3Rpb24odHlwZSwgZGF0YSwgc2V0dGluZ3MsIHJlc29sdmVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmltcGxlbWVudGVkIG1ldGhvZC4nKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMuZXh0ZW5kID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kO1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqIEEgY2VudHJhbCBkaXNwYXRjaGVyIGZvciBzZW5kaW5nIGNvbW1hbmRzIHRvIHRoZSBjYW5vbmljYWwgZGF0YSBzdG9yZS5cbiAqXG4gKiBEZWZhdWx0IFN1cHBvcnRlZCBBY3Rpb25zOlxuICpcbiAqICAgSU5TRVJUX0lURU06IFJlcXVlc3RzIGEgbmV3IGVkaXQgYnVmZmVyIGl0ZW0gZnJvbSB0aGUgZGF0YSBzdG9yZS4gVGhpc1xuICogICB0cmlnZ2VycyB0aGUgY3JlYXRpb24gb2YgYW4gZWRpdCBidWZmZXIgaXRlbSBvbiB0aGUgc2VydmVyLCBhbmQgc2hvdWxkXG4gKiAgIHJlc29sdmUgd2l0aCB0aGUgbmV3IGl0ZW0uXG4gKlxuICogICBFRElUX0lURU06IFJlcXVlc3RzIHRoYXQgYW4gZXhpc3RpbmcgZWRpdCBidWZmZXIgaXRlbSBiZSBlZGl0ZWQuIFRoaXNcbiAqICAgdHJpZ2dlcnMgYW4gZWRpdCBmbG93IG9uIHRoZSBzZXJ2ZXIuIFRoZSBhY3R1YWwgZGV0YWlscyBvZiB0aGF0IGZsb3cgYXJlXG4gKiAgIG5vdCBlbmZvcmNlZC4gRm9yIGV4YW1wbGUsIHRoZSBzZXJ2ZXIgbWF5IGRlbGl2ZXIgYmFjayBhbiBhamF4IGZvcm0gZm9yIHRoZVxuICogICBlZGl0IGJ1ZmZlciBpdGVtIGFuZCByZXNvbHZlIHRoZSBhY3Rpb24gb25jZSB0aGF0IGZvcm0gaXMgc3VibWl0dGVkLiBUaGVcbiAqICAgcmVzb2x1dGlvbiBzaG91bGQgaW5jbHVkZSB0aGUgdXBkYXRlcyBtYWRlIHRvIHRoZSBlZGl0IGJ1ZmZlciBpdGVtIG1vZGVsLlxuICpcbiAqICAgUkVOREVSX0lURU06IFJlcXVlc3RzIHRoZSByZXByZXNlbnRhdGlvbmFsIG1hcmt1cCBmb3IgYSBkYXRhIGVudGl0eSB0aGF0XG4gKiAgIHdpbGwgYmUgcmVuZGVyZWQgaW4gdGhlIGVkaXRvciB2aWV3bW9kZS4gVGhlIGNvbW1hbmQgc2hvdWxkIHJlc29sdmUgd2l0aFxuICogICB0aGUgZWRpdCBidWZmZXIgaXRlbSBtb2RlbCBjb250YWluaW5nIHRoZSB1cGRhdGVkIG1hcmt1cC4gVGhpcyBtYXJrdXAgd2lsbFxuICogICBhdXRvbWF0aWNhbGx5IGJlIHN5bmNlZCB0byB0aGUgd2lkZ2V0LiBUaGUgbWFya3VwIGNhbiBhbHNvIGNvbnRhaW4gaW5saW5lXG4gKiAgIGVkaXRhYmxlIGZpZWxkcyBpbiB0aGUgZm9ybWF0IHNwZWNpZmllZCBieSB0aGUgc3luYyBjb25maWd1cmF0aW9uLlxuICpcbiAqICAgRFVQTElDQVRFX0lURU06IFJlcXVlc3RzIHRoYXQgYW4gaXRlbSBiZSBkdXBsaWNhdGVkIGluIHRoZSBzdG9yZSwgcmVzdWx0aW5nXG4gKiAgIGluIGEgbmV3bHkgY3JlYXRlZCBpdGVtLiBUaGlzIGNvbW1hbmQgc2hvdWxkIHJlc29sdmUgd2l0aCB0aGUgbmV3bHkgY3JlYXRlZFxuICogICBlZGl0IGJ1ZmZlciBtb2RlbC5cbiAqXG4gKiAgIEZFVENIX1NDSEVNQTogUmVxdWVzdHMgdGhlIHNjaGVtYSBmb3IgYSBmaWVsZCBmcm9tIHRoZSBzZXJ2ZXIuIFRoaXMgc2hvdWxkXG4gKiAgIHJlc29sdmUgd2l0aCBhIHNjaGVtYSBtb2RlbCBkZXRhaWxpbmcgd2hpY2ggb3RoZXIgdHlwZXMgb2YgZmllbGRzIGNhbiBiZVxuICogICBuZXN0ZWQgaW5zaWRlIHRoZSBnaXZlbiBmaWVsZCB0eXBlLlxuICpcbiAqIEBwYXJhbSB7U3luY1Byb3RvY29sfSBwcm90b2NvbFxuICogICBBIHByb3RvY29sIHBsdWdpbiBmb3IgaGFuZGxpbmcgdGhlIHJlcXVlc3QgLyByZXNwb25zZSB0cmFuc2FjdGlvbi5cbiAqIEBwYXJhbSB7U3luY0FjdGlvblJlc29sdmVyfSByZXNvbHZlclxuICogICBUaGUgcmVzb2x2ZXIgc2VydmljZSBmb3IgcHJvY2Vzc2luZyBzeW5jIGFjdGlvbiByZXNwb25zZXMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocHJvdG9jb2wsIHJlc29sdmVyKSB7XG4gIHRoaXMuX3Byb3RvY29sID0gcHJvdG9jb2w7XG4gIHRoaXMuX3Jlc29sdmVyID0gcmVzb2x2ZXI7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogRGlzcGF0Y2hlcyBhIHN5bmMgYWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgKiAgIFNob3VsZCBiZSBvbmUgb2Y6ICdJTlNFUlRfSVRFTScsICdFRElUX0lURU0nLCAnUkVOREVSX0lURU0nLFxuICAgKiAgICdEVVBMSUNBVEVfSVRFTScsICdGRVRDSF9TQ0hFTUEnLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YVxuICAgKiAgIEFyYml0cmFyeSBkYXRhIHJlcHJlc2VudGluZyB0aGUgcmVxdWVzdC5cbiAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzXG4gICAqICAgQ29udGV4dC1zcGVjaWZpYyBzZXR0aW5ncyB0byBiZSBzZW50IHdpdGggdGhlIHJlcXVlc3QuXG4gICAqL1xuICBkaXNwYXRjaDogZnVuY3Rpb24odHlwZSwgZGF0YSwgc2V0dGluZ3MpIHtcbiAgICB0aGlzLl9wcm90b2NvbC5zZW5kKHR5cGUsIGRhdGEsIHNldHRpbmdzLCB0aGlzLl9yZXNvbHZlcik7XG4gIH1cblxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICogQSBjbGFzcyBmb3IgcmVzb2x2aW5nIGRpc3BhdGNoZWQgYWN0aW9ucy5cbiAqXG4gKiBEaXNwYXRjaGVkIGFjdGlvbnMgYXJlIHJlc29sdmVkIGJ5IGNoZWNraW5nIHRoZSByZXNwb25zZSBmb3IgbW9kZWxzIHRoYXRcbiAqIHNob3VsZCBiZSBhZGRlZCB0byB0aGUgYXBwcm9wcmlhdGUgY29sbGVjdGlvbi5cbiAqXG4gKiBUaGUgcmVzb2x2ZXIgc2VydmljZSBpcyBzZXQgdXAgd2l0aCBhIG1hcHBpbmdzIG9mIG1vZGVscy10by1jb2xsZWN0aW9ucyBhbmRcbiAqIHVzZXMgdGhpcyBtYXBwaW5nIHRvIHVwZGF0ZSB0aGUgYXNzb2NpYXRlZCBjb2xsZWN0aW9uIHdoZW4gaXQgc2VlcyBhIG1vZGVsXG4gKiB0aGF0IGhhcyBiZWVuIG1hcHBlZC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fY29sbGVjdGlvbnMgPSB7fTtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBBZGRzIGEgbW9kZWwtdG8tY29sbGVjdGlvbiBtYXAuXG4gICAqXG4gICAqIFRoaXMgbWFwIGlzIHVzZWQgdG8gYWRkIG1vZGVscyBpbiB0aGUgcmVzcG9uc2UgdG8gdGhlIGFwcHJvcHJpYXRlXG4gICAqIGNvbGxlY2l0b24uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtb2RlbE5hbWVcbiAgICogICBUaGUga2V5IGluIHRoZSByZXNwb25zZSBvYmplY3QgdGhhdCBjb250YWlucyBhIG1vZGVsIHRvIGJlIGFkZGVkIHRvIHRoZVxuICAgKiAgIHNwZWNpZmllZCBjb2xsZWN0aW9uLlxuICAgKiBAcGFyYW0ge21peGVkfSBjb2xsZWN0aW9uQ2FsbGJhY2tcbiAgICogICBJZiB0aGUgcGFzc2VkIHZhbHVlIGlzIGEgQmFja2JvbmUuQ29sbGVjdGlvbiwgbW9kZWxzIGluIHRoZSByZXNwb25zZSB3aWxsXG4gICAqICAgYmUgYWRkZWQgZGlyZWN0bHkgdG8gdGhpcyBjb2xsZWN0aW9uLiBJZiB0aGUgcGFzc2VkIHZhbHVlIGlzIGEgZnVuY3Rpb24sXG4gICAqICAgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIG1vZGVsIGF0dHJpYnV0ZXMgaW4gdGhlXG4gICAqICAgcmVzcG9uc2UgYW5kIHNob3VsZCByZXR1cm4gdGhlIHJlc29sdmVkIGNvbGxlY3Rpb24uIFRoZSBtb2RlbCB3aWxsIGJlXG4gICAqICAgYWRkZWQgdG8gdGhlIHJlc29sdmVkIGNvbGxlY3Rpb24gaW4gdGhpcyBjYXNlLlxuICAgKi9cbiAgYWRkQ29sbGVjdGlvbjogZnVuY3Rpb24obW9kZWxOYW1lLCBjb2xsZWN0aW9uQ2FsbGJhY2spIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uc1ttb2RlbE5hbWVdID0gY29sbGVjdGlvbkNhbGxiYWNrO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlcyBhIGRpc3BhdGNoZWQgc3luYyBhY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZVxuICAgKiAgIEEgcGxhaW4gamF2YXNjcmlwdCBvYmplY3QgdGhhdCBjb250YWlucyB0aGUgYWN0aW9uIHJlc3BvbnNlLiBLZXlzIGluIHRoaXNcbiAgICogICBvYmplY3Qgc2hvdWxkIGJlIG1vZGVsIG5hbWVzIGFzIHBhc3NlZCB0byB0aGUgYWRkQ29sbGVjdGlvbiBtZXRob2QuIFRoZVxuICAgKiAgIHZhbHVlcyBpbiB0aGlzIG9iamVjdCBzaG91bGQgYmUgbW9kZWxzIHRvIGJlIGFkZGVkIHRvIHRoZSBhc3NvY2lhdGVkXG4gICAqICAgY29sbGVjdGlvbi4gRWFjaCBlbnRyeSBpbiB0aGUgb2JqZWN0IHNob3VsZCBjb250YWluIGEgamF2YXNjcmlwdCBvYmplY3QsXG4gICAqICAga2V5ZWQgYnkgdGhlIG1vZGVsJ3MgaWQsIGFuZCBjb250YWluZyB0aGUgbW9kZWwgYXR0cmlidXRlcyB0byBiZSBzZXQgaW5cbiAgICogICB0aGUgY29sbGVjdGlvbiBhcyBhIHZhbHVlLlxuICAgKi9cbiAgcmVzb2x2ZTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICBfLmVhY2gocmVzcG9uc2UsIGZ1bmN0aW9uKG1vZGVscywgbW9kZWxOYW1lKSB7XG4gICAgICBpZiAodGhpcy5fY29sbGVjdGlvbnNbbW9kZWxOYW1lXSkge1xuICAgICAgICB0aGlzLl91cGRhdGVNb2RlbHMobW9kZWxzLCB0aGlzLl9jb2xsZWN0aW9uc1ttb2RlbE5hbWVdKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkcyBtb2RlbHMgdG8gYSBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gbW9kZWxzXG4gICAqICAgQW4gb2JqZWN0IHdoZXJlIGtleXMgYXJlIG1vZGVsIGlkcyBhbmQgdmFsdWVzIGFyZSBtb2RlbCBhdHRyaWJ1dGVzLlxuICAgKiBAcGFyYW0ge21peGVkfSBjb2xsZWN0aW9uXG4gICAqICAgQ2FuIGVpdGhlciBiZSBhIEJhY2tib25lLkNvbGxlY3Rpb24gdG8gYWRkIHRoZSBtb2RlbCB0bywgb3IgYSBjYWxsYmFja1xuICAgKiAgIHdoaWNoIHJldHVybnMgdGhlIGNvbGxlY3Rpb24uXG4gICAqL1xuICBfdXBkYXRlTW9kZWxzOiBmdW5jdGlvbihtb2RlbHMsIGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgcmVzb2x2ZWRDb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbiAgICBfLmVhY2gobW9kZWxzLCBmdW5jdGlvbihhdHRyaWJ1dGVzLCBpZCkge1xuXG4gICAgICAvLyBJZiBhIGZ1bmN0aW9uIGlzIHBhc3NlZCBhcyB0aGUgY29sbGVjdGlvbiwgd2UgY2FsbCBpdCB0byByZXNvbHZlIHRoZVxuICAgICAgLy8gYWN0dWFsIGNvbGxlY3Rpb24gZm9yIHRoaXMgbW9kZWwuXG4gICAgICBpZiAodHlwZW9mIGNvbGxlY3Rpb24gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXNvbHZlZENvbGxlY3Rpb24gPSBjb2xsZWN0aW9uKGF0dHJpYnV0ZXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBXZSBmaXJzdCB0cnkgdG8gbG9hZCB0aGUgZXhpc3RpbmcgbW9kZWwgaW5zdGVhZCBvZiBkaXJlY3RseSBzZXR0aW5nIHRoZVxuICAgICAgLy8gbW9kZWwgaW4gY29sbGVjdGlvbiBzaW5jZSBpdCBpcyBjb21wbGV0ZWx5IHZhbGlkIGZvciBhIG1vZGVsJ3MgaWQgdG9cbiAgICAgIC8vIGNoYW5nZS5cbiAgICAgIHZhciBleGlzdGluZyA9IHJlc29sdmVkQ29sbGVjdGlvbi5nZXQoaWQpO1xuICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgIGV4aXN0aW5nLnNldChhdHRyaWJ1dGVzKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZiAoIWF0dHJpYnV0ZXMuaWQpIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzLmlkID0gaWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmVzb2x2ZWRDb2xsZWN0aW9uLmFkZChhdHRyaWJ1dGVzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG59KTtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIG1hcmt1cCwgYWN0aW9ucykge1xuICB2YXIgZGlzcGxheUVsZW1lbnQgPSBlbGVtZW50RmFjdG9yeS5jcmVhdGUoJ3dpZGdldC1kaXNwbGF5Jyk7XG4gIHZhciB0b29sYmFyRWxlbWVudCA9IGVsZW1lbnRGYWN0b3J5LmNyZWF0ZSgndG9vbGJhcicpO1xuICB2YXIgdG9vbGJhckl0ZW1FbGVtZW50ID0gZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd0b29sYmFyLWl0ZW0nKTtcbiAgdmFyIGNvbW1hbmRFbGVtZW50ID0gZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd3aWRnZXQtY29tbWFuZCcpO1xuXG4gIHZhciByZXN1bHQgPSBkaXNwbGF5RWxlbWVudC5yZW5kZXJPcGVuaW5nVGFnKClcbiAgICArIG1hcmt1cFxuICAgICsgdG9vbGJhckVsZW1lbnQucmVuZGVyT3BlbmluZ1RhZygpO1xuXG4gIF8uZWFjaChhY3Rpb25zLCBmdW5jdGlvbihkZWYsIGlkKSB7XG4gICAgICByZXN1bHQgKz0gdG9vbGJhckl0ZW1FbGVtZW50LnJlbmRlck9wZW5pbmdUYWcoKVxuICAgICAgICArIGNvbW1hbmRFbGVtZW50LnNldEF0dHJpYnV0ZSgnPGNvbW1hbmQ+JywgaWQpLnJlbmRlck9wZW5pbmdUYWcoKSArIGRlZi50aXRsZSArIGNvbW1hbmRFbGVtZW50LnJlbmRlckNsb3NpbmdUYWcoKVxuICAgICAgKyB0b29sYmFySXRlbUVsZW1lbnQucmVuZGVyQ2xvc2luZ1RhZygpO1xuICB9KTtcblxuICByZXN1bHQgKz0gdG9vbGJhckVsZW1lbnQucmVuZGVyQ2xvc2luZ1RhZygpXG4gICAgKyBkaXNwbGF5RWxlbWVudC5yZW5kZXJDbG9zaW5nVGFnKCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsZW1lbnRGYWN0b3J5LCBmaWVsZHMsIGVkaXRzKSB7XG4gIHZhciByZXN1bHQgPSAnJztcblxuICBpZiAoZmllbGRzKSB7XG4gICAgXy5lYWNoKGZpZWxkcywgZnVuY3Rpb24obm9kZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlbGVtZW50RmFjdG9yeS5jcmVhdGUobm9kZS50eXBlLCBub2RlKTtcbiAgICAgIHZhciBlZGl0OyBcblxuICAgICAgaWYgKG5vZGUudHlwZSA9PSAnZmllbGQnKSB7XG4gICAgICAgIGlmIChub2RlLmNvbnRleHQpIHtcbiAgICAgICAgICBlZGl0ID0gZWRpdHNbbm9kZS5jb250ZXh0XTtcbiAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnPGVkaXRhYmxlPicsICd0cnVlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJzxlZGl0YWJsZT4nLCAnZmFsc2UnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXN1bHQgKz0gZWxlbWVudC5yZW5kZXJPcGVuaW5nVGFnKCk7XG5cbiAgICAgIGlmIChlZGl0KSB7XG4gICAgICAgIHJlc3VsdCArPSBlZGl0O1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJlc3VsdCArPSBtb2R1bGUuZXhwb3J0cyhlbGVtZW50RmFjdG9yeSwgbm9kZS5jaGlsZHJlbiwgZWRpdHMpO1xuICAgICAgfVxuXG4gICAgICByZXN1bHQgKz0gZWxlbWVudC5yZW5kZXJDbG9zaW5nVGFnKCk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgdmlldyBmb3Igd3JhcHBpbmcgY29udGV4dCBjb250YWluaW5nIERPTSBub2Rlcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblxuICAvKipcbiAgICoge0Bpbmhlcml0ZG9jfVxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oYXR0cmlidXRlcywgb3B0aW9ucykge1xuICAgIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gb3B0aW9ucy5lbGVtZW50RmFjdG9yeTtcblxuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgJ2NoYW5nZTppZCcsIHRoaXMucmVuZGVyKTtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsICdkZXN0cm95JywgdGhpcy5zdG9wTGlzdGVuaW5nKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLl9lbGVtZW50RmFjdG9yeS5nZXRUZW1wbGF0ZSgnZmllbGQnKTtcbiAgICB0aGlzLiRlbC5hdHRyKHRlbXBsYXRlLmdldEF0dHJpYnV0ZU5hbWUoJzxjb250ZXh0PicpLCB0aGlzLm1vZGVsLmdldCgnY29udGV4dCcpKTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIHZpZXcgZm9yIHJlcHJlc2VudGluZyB3aWRnZXRzIHdpdGhpbiB0aGUgZWRpdG9yLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgJCA9IEJhY2tib25lLiQ7XG5cbi8qKlxuICogQmFja2JvbmUgdmlldyBmb3IgcmVwcmVzZW50aW5nIHdpZGdldHMgd2l0aGluIHRoZSBlZGl0b3IuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG4gIGFjdGlvbnM6IHtcbiAgICBlZGl0OiB7XG4gICAgICB0aXRsZTogJ0VkaXQnLFxuICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnNhdmUoKS5lZGl0KCk7XG4gICAgICB9XG4gICAgfSxcbiAgICByZW1vdmU6IHtcbiAgICAgIHRpdGxlOiAnUmVtb3ZlJyxcbiAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIHtAaW5oZXJpdGRvY31cbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLmFkYXB0ZXIgPSBvcHRpb25zLmFkYXB0ZXI7XG4gICAgdGhpcy5fZWxlbWVudEZhY3RvcnkgPSBvcHRpb25zLmVsZW1lbnRGYWN0b3J5O1xuICAgIHRoaXMudGVtcGxhdGUgPSBvcHRpb25zLnRlbXBsYXRlO1xuXG4gICAgLy8gR2V0IGEgbGlzdCBvZiB0ZW1wbGF0ZXMgdGhhdCB3aWxsIGJlIHVzZWQuXG4gICAgdmFyIHdpZGdldFRlbXBsYXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ3dpZGdldCcpO1xuICAgIHZhciBmaWVsZFRlbXBsYXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ2ZpZWxkJyk7XG4gICAgdmFyIHdpZGdldENvbW1hbmRUZW1wbGF0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCd3aWRnZXQtY29tbWFuZCcpO1xuXG4gICAgLy8gU2V0IHVwIGF0dHJpYnV0ZSAvIGVsZW1lbnQgc2VsZWN0b3JzLlxuICAgIHRoaXMud2lkZ2V0U2VsZWN0b3IgPSB3aWRnZXRUZW1wbGF0ZS5nZXRTZWxlY3RvcigpO1xuICAgIHRoaXMudmlld01vZGVBdHRyaWJ1dGUgPSB3aWRnZXRUZW1wbGF0ZS5nZXRBdHRyaWJ1dGVOYW1lKCc8dmlld21vZGU+Jyk7XG4gICAgdGhpcy5pbmxpbmVDb250ZXh0QXR0cmlidXRlID0gZmllbGRUZW1wbGF0ZS5nZXRBdHRyaWJ1dGVOYW1lKCc8Y29udGV4dD4nKTtcbiAgICB0aGlzLmNvbW1hbmRTZWxlY3RvciA9IHdpZGdldENvbW1hbmRUZW1wbGF0ZS5nZXRTZWxlY3RvcigpO1xuICAgIHRoaXMuY29tbWFuZEF0dHJpYnV0ZSA9IHdpZGdldENvbW1hbmRUZW1wbGF0ZS5nZXRBdHRyaWJ1dGVOYW1lKCc8Y29tbWFuZD4nKTtcbiAgICB0aGlzLmlubGluZUVkaXRvclNlbGVjdG9yID0gZmllbGRUZW1wbGF0ZS5nZXRTZWxlY3RvcigpO1xuXG4gICAgdGhpcy5fc3RhdGUgPSB7fTtcblxuICAgIC8vIFNldCB1cCB0aGUgY2hhbmdlIGhhbmRsZXIuXG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCAnY2hhbmdlJywgdGhpcy5fY2hhbmdlSGFuZGxlcik7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCAncmViYXNlJywgdGhpcy5fcmViYXNlKTtcbiAgICB0aGlzLl9yZWJhc2VkID0ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIG1hcmt1cCwgYWN0aW9ucykge1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbihwcmVzZXJ2ZURvbUVkaXRzKSB7XG4gICAgaWYgKHRoaXMubW9kZWwuZ2V0KCdkdXBsaWNhdGluZycpKSB7XG4gICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5fZWxlbWVudEZhY3RvcnksICcuLi4nLCB0aGlzLmFjdGlvbnMpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAocHJlc2VydmVEb21FZGl0cykge1xuICAgICAgICB2YXIgZG9tRWRpdHMgPSB7fTtcbiAgICAgICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcikge1xuICAgICAgICAgIGRvbUVkaXRzW2NvbnRleHRTdHJpbmddID0gJGVsLmNoaWxkcmVuKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciAkb2xkQ29udGFpbmVyID0gJCgnPGRpdj48L2Rpdj4nKTtcbiAgICAgICAgdmFyICRuZXdDb250YWluZXIgPSAkKCc8ZGl2PjwvZGl2PicpO1xuICAgICAgICB2YXIgJG9sZENoaWxkcmVuID0gdGhpcy4kZWwuY2hpbGRyZW4oKTtcbiAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCRvbGRDb250YWluZXIpO1xuICAgICAgICB0aGlzLiRlbC5hcHBlbmQoJG5ld0NvbnRhaW5lcik7XG5cbiAgICAgICAgJG9sZENvbnRhaW5lci5hcHBlbmQoJG9sZENoaWxkcmVuKTtcbiAgICAgICAgJG5ld0NvbnRhaW5lci5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5fZWxlbWVudEZhY3RvcnksIHRoaXMubW9kZWwuZ2V0KCdtYXJrdXAnKSwgdGhpcy5hY3Rpb25zKSk7IFxuICAgICAgICB0aGlzLl9maW5kKHRoaXMuaW5saW5lRWRpdG9yU2VsZWN0b3IsICRvbGRDb250YWluZXIpLmF0dHIodGhpcy5pbmxpbmVDb250ZXh0QXR0cmlidXRlLCAnJyk7XG5cbiAgICAgICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcikge1xuICAgICAgICAgIHRoaXMuYWRhcHRlci5hdHRhY2hJbmxpbmVFZGl0aW5nKHRoaXMsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKTtcblxuICAgICAgICAgIGlmIChkb21FZGl0c1tjb250ZXh0U3RyaW5nXSkge1xuICAgICAgICAgICAgJGVsLmh0bWwoJycpLmFwcGVuZChkb21FZGl0c1tjb250ZXh0U3RyaW5nXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAkbmV3Q29udGFpbmVyKTtcblxuICAgICAgICB0aGlzLiRlbC5hcHBlbmQoJG5ld0NvbnRhaW5lci5jaGlsZHJlbigpKTtcbiAgICAgICAgJG9sZENvbnRhaW5lci5yZW1vdmUoKTtcbiAgICAgICAgJG5ld0NvbnRhaW5lci5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5fZWxlbWVudEZhY3RvcnksIHRoaXMubW9kZWwuZ2V0KCdtYXJrdXAnKSwgdGhpcy5hY3Rpb25zKSk7XG5cbiAgICAgICAgdGhpcy5fcmViYXNlKCk7XG4gICAgICAgIHZhciBlZGl0cyA9IHRoaXMubW9kZWwuZ2V0KCdlZGl0cycpO1xuICAgICAgICB0aGlzLl9pbmxpbmVFbGVtZW50VmlzaXRvcihmdW5jdGlvbigkZWwsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKSB7XG4gICAgICAgICAgaWYgKGVkaXRzW2NvbnRleHRTdHJpbmddKSB7XG4gICAgICAgICAgICAkZWwuaHRtbChlZGl0c1tjb250ZXh0U3RyaW5nXSA/IGVkaXRzW2NvbnRleHRTdHJpbmddIDogJycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuYWRhcHRlci5hdHRhY2hJbmxpbmVFZGl0aW5nKHRoaXMsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIF8uZWFjaCh0aGlzLl9yZWJhc2VkLCBmdW5jdGlvbih1bnVzZWQsIGNvbnRleHRTdHJpbmcpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gJ1snICsgdGhpcy5pbmxpbmVDb250ZXh0QXR0cmlidXRlICsgJz1cIicgKyBjb250ZXh0U3RyaW5nICsgJ1wiXSc7XG4gICAgICAgIHRoaXMuYWRhcHRlci5kZXRhY2hJbmxpbmVFZGl0aW5nKHRoaXMsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgICAgdGhpcy5fcmViYXNlZCA9IHt9O1xuXG4gICAgICB2YXIgdmlldyA9IHRoaXM7XG4gICAgICB0aGlzLl9maW5kKHRoaXMuY29tbWFuZFNlbGVjdG9yKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFjdGlvbiA9ICQodGhpcykuYXR0cih2aWV3LmNvbW1hbmRBdHRyaWJ1dGUpO1xuICAgICAgICB2aWV3LmFjdGlvbnNbYWN0aW9uXS5jYWxsYmFjay5jYWxsKHZpZXcpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlbmRlckF0dHJpYnV0ZXMoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHJlbmRlckF0dHJpYnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd3aWRnZXQnLCB7XG4gICAgICBjb250ZXh0OiB0aGlzLm1vZGVsLmdldCgnY29udGV4dElkJyksXG4gICAgICB1dWlkOiB0aGlzLm1vZGVsLmdldCgnaXRlbUlkJyksXG4gICAgICB2aWV3bW9kZTogJ2VkaXRvcicsXG4gICAgfSk7XG5cbiAgICBfLmVhY2goZWxlbWVudC5nZXRBdHRyaWJ1dGVzKCksIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICB0aGlzLiRlbC5hdHRyKG5hbWUsIHZhbHVlKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgc2F2ZTogZnVuY3Rpb24oKSB7XG5cbiAgICBpZiAoIXRoaXMubW9kZWwuZ2V0KCdkdXBsaWNhdGluZycpKSB7XG4gICAgICB2YXIgZWRpdHMgPSB7fTtcbiAgICAgIHRoaXMuX2lubGluZUVsZW1lbnRWaXNpdG9yKGZ1bmN0aW9uKCRlbCwgY29udGV4dFN0cmluZywgc2VsZWN0b3IpIHtcbiAgICAgICAgZWRpdHNbY29udGV4dFN0cmluZ10gPSB0aGlzLmFkYXB0ZXIuZ2V0SW5saW5lRWRpdCh0aGlzLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcik7XG4gICAgICB9KTtcbiAgICAgIHRoaXMubW9kZWwuc2V0KHtlZGl0czogZWRpdHN9LCB7c2lsZW50OiB0cnVlfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBfcmViYXNlOiBmdW5jdGlvbihtb2RlbCwgb2xkSWQsIG5ld0lkKSB7XG4gICAgaWYgKCFtb2RlbCkge1xuICAgICAgbW9kZWwgPSB0aGlzLm1vZGVsO1xuICAgIH1cblxuICAgIGlmIChvbGRJZCAmJiBuZXdJZCkge1xuICAgICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcikge1xuICAgICAgICBpZiAoY29udGV4dFN0cmluZyA9PSBvbGRJZCkge1xuICAgICAgICAgICRlbC5hdHRyKHRoaXMuaW5saW5lQ29udGV4dEF0dHJpYnV0ZSwgbmV3SWQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHRoaXMuX3JlYmFzZWRbb2xkSWRdID0gdHJ1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgb2xkRWRpdHMgPSBfLnRvQXJyYXkodGhpcy5tb2RlbC5nZXQoJ2VkaXRzJykpO1xuICAgICAgdmFyIGVkaXRzID0ge307XG4gICAgICB0aGlzLl9pbmxpbmVFbGVtZW50VmlzaXRvcihmdW5jdGlvbigkZWwsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciBvbGRFZGl0ID0gb2xkRWRpdHMucG9wKCk7XG4gICAgICAgIGVkaXRzW2NvbnRleHRTdHJpbmddID0gb2xkRWRpdCA/IG9sZEVkaXQgOiAnJztcbiAgICAgIH0pO1xuICAgICAgdGhpcy5tb2RlbC5zZXQoeyBlZGl0czogZWRpdHMgfSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZWRpdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb2RlbC5lZGl0KCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIGlmICh0aGlzLm1vZGVsKSB7XG4gICAgICB2YXIgbW9kZWwgPSB0aGlzLm1vZGVsO1xuICAgICAgdGhpcy5tb2RlbCA9IG51bGw7XG4gICAgICBtb2RlbC5kZXN0cm95KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZmluZCh0aGlzLmNvbW1hbmRTZWxlY3Rvcikub2ZmKCk7XG4gICAgcmV0dXJuIEJhY2tib25lLlZpZXcucHJvdG90eXBlLnN0b3BMaXN0ZW5pbmcuY2FsbCh0aGlzKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGlzRWRpdG9yVmlld1JlbmRlcmVkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy4kZWwuYXR0cih0aGlzLnZpZXdNb2RlQXR0cmlidXRlKSA9PSAnZWRpdG9yJztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIF9jaGFuZ2VIYW5kbGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbWFya3VwQ2hhbmdlZCA9IHRoaXMubW9kZWwuaGFzQ2hhbmdlZCgnbWFya3VwJyk7XG4gICAgaWYgKHRoaXMubW9kZWwuZ2V0KCdkdXBsaWNhdGluZycpIHx8IHRoaXMubW9kZWwucHJldmlvdXMoJ2R1cGxpY2F0aW5nJykpIHtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgZWxzZSBpZiAodGhpcy5tb2RlbC5oYXNDaGFuZ2VkKCdtYXJrdXAnKSkge1xuICAgICAgdGhpcy5yZW5kZXIodHJ1ZSk7XG4gICAgfVxuXG4gICAgZWxzZSBpZiAodGhpcy5tb2RlbC5oYXNDaGFuZ2VkKCdpdGVtSWQnKSB8fCB0aGlzLm1vZGVsLmhhc0NoYW5nZWQoJ2NvbnRleHRJZCcpKSB7XG4gICAgICB0aGlzLnJlbmRlckF0dHJpYnV0ZXMoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIF9pbmxpbmVFbGVtZW50VmlzaXRvcjogZnVuY3Rpb24oY2FsbGJhY2ssICRyb290RWwpIHtcbiAgICBpZiAoISRyb290RWwpIHtcbiAgICAgICRyb290RWwgPSB0aGlzLiRlbDtcbiAgICB9XG4gICAgdmFyIHZpZXcgPSB0aGlzO1xuICAgIHRoaXMuX2ZpbmQodGhpcy5pbmxpbmVFZGl0b3JTZWxlY3RvciwgJHJvb3RFbCkuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkKHRoaXMpLmNsb3Nlc3Qodmlldy53aWRnZXRTZWxlY3RvcikuaXModmlldy4kZWwpKSB7XG4gICAgICAgIHZhciBjb250ZXh0U3RyaW5nID0gJCh0aGlzKS5hdHRyKHZpZXcuaW5saW5lQ29udGV4dEF0dHJpYnV0ZSk7XG4gICAgICAgIHZhciBzZWxlY3RvciA9ICdbJyArIHZpZXcuaW5saW5lQ29udGV4dEF0dHJpYnV0ZSArICc9XCInICsgY29udGV4dFN0cmluZyArICdcIl0nO1xuICAgICAgICBjYWxsYmFjay5jYWxsKHZpZXcsICQodGhpcyksIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBfZmluZDogZnVuY3Rpb24oc2VsZWN0b3IsICRyb290RWwpIHtcbiAgICB2YXIgdmlldyA9IHRoaXM7XG4gICAgdmFyICRyZXN1bHQgPSAkKFtdKTtcblxuICAgIGlmICghJHJvb3RFbCkge1xuICAgICAgJHJvb3RFbCA9IHRoaXMuJGVsO1xuICAgIH1cblxuICAgICRyb290RWwuY2hpbGRyZW4oKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRjaGlsZCA9ICQodGhpcyk7XG4gICAgICBpZiAoJGNoaWxkLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAkcmVzdWx0ID0gJHJlc3VsdC5hZGQoJGNoaWxkKTtcbiAgICAgIH1cbiAgICAgIGlmICghJGNoaWxkLmlzKHZpZXcud2lkZ2V0U2VsZWN0b3IpKSB7XG4gICAgICAgICRyZXN1bHQgPSAkcmVzdWx0LmFkZCh2aWV3Ll9maW5kKHNlbGVjdG9yLCAkY2hpbGQpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiAkcmVzdWx0O1xuICB9LFxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgdmlldyBmb3IgcmVwcmVzZW50aW5nIHRoZSBleHBvcnRlZCBkYXRhIHN0YXRlIG9mIGEgd2lkZ2V0LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgJCA9IEJhY2tib25lLiQ7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHRoaXMuYWRhcHRlciA9IG9wdGlvbnMuYWRhcHRlcjtcbiAgICB0aGlzLmVsZW1lbnRGYWN0b3J5ID0gb3B0aW9ucy5lbGVtZW50RmFjdG9yeTtcbiAgICB0aGlzLnRlbXBsYXRlID0gb3B0aW9ucy50ZW1wbGF0ZTtcblxuICAgIC8vIEdldCBhIGxpc3Qgb2YgdGVtcGxhdGVzIHRoYXQgd2lsbCBiZSB1c2VkLlxuICAgIHZhciB3aWRnZXRUZW1wbGF0ZSA9IHRoaXMuZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ3dpZGdldCcpO1xuICAgIHZhciBmaWVsZFRlbXBsYXRlID0gdGhpcy5lbGVtZW50RmFjdG9yeS5nZXRUZW1wbGF0ZSgnZmllbGQnKTtcblxuICAgIC8vIFNldCB1cCBhdHRyaWJ1dGUgLyBlbGVtZW50IHNlbGVjdG9ycy5cbiAgICB0aGlzLndpZGdldFNlbGVjdG9yID0gd2lkZ2V0VGVtcGxhdGUuZ2V0U2VsZWN0b3IoKTtcbiAgICB0aGlzLmlubGluZUNvbnRleHRBdHRyaWJ1dGUgPSBmaWVsZFRlbXBsYXRlLmdldEF0dHJpYnV0ZU5hbWUoJzxjb250ZXh0PicpO1xuICAgIHRoaXMuaW5saW5lRWRpdG9yU2VsZWN0b3IgPSBmaWVsZFRlbXBsYXRlLmdldFNlbGVjdG9yKCk7XG5cbiAgICAvLyBGaWx0ZXIgb3V0IG5vbi1jb25maWd1cmVkIGF0dHJpYnV0ZXMuXG4gICAgdGhpcy5hdHRyaWJ1dGVXaGl0ZWxpc3QgPSBfLmludmVydCh3aWRnZXRUZW1wbGF0ZS5nZXRBdHRyaWJ1dGVOYW1lcygpKTtcbiAgICBkZWxldGUgdGhpcy5hdHRyaWJ1dGVXaGl0ZWxpc3Rbd2lkZ2V0VGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZSgnPHZpZXdtb2RlPicpXTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHRlbXBsYXRlOiBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgZmllbGRzLCBlZGl0cykge1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmlldyA9IHRoaXM7XG4gICAgdmFyIGZpZWxkcyA9IHRoaXMubW9kZWwuZWRpdEJ1ZmZlckl0ZW1SZWYuZWRpdEJ1ZmZlckl0ZW0uZ2V0KCdmaWVsZHMnKTtcbiAgICB2YXIgZWRpdHMgPSB0aGlzLm1vZGVsLmdldCgnZWRpdHMnKTtcbiAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5lbGVtZW50RmFjdG9yeSwgZmllbGRzLCBlZGl0cykpO1xuICAgIF8uZWFjaCh0aGlzLmVsLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKGF0dHIpIHtcbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKHZpZXcuYXR0cmlidXRlV2hpdGVsaXN0W2F0dHIubmFtZV0pKSB7XG4gICAgICAgIHZpZXcuJGVsLnJlbW92ZUF0dHIoYXR0ci5uYW1lKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHNhdmU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlZGl0cyA9IHt9O1xuICAgIHZhciB2aWV3ID0gdGhpcztcbiAgICB0aGlzLiRlbC5maW5kKHRoaXMuaW5saW5lRWRpdG9yU2VsZWN0b3IpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJCh0aGlzKS5jbG9zZXN0KHZpZXcud2lkZ2V0U2VsZWN0b3IpLmlzKHZpZXcuJGVsKSkge1xuICAgICAgICB2YXIgY29udGV4dFN0cmluZyA9ICQodGhpcykuYXR0cih2aWV3LmlubGluZUNvbnRleHRBdHRyaWJ1dGUpO1xuICAgICAgICBlZGl0c1tjb250ZXh0U3RyaW5nXSA9ICQodGhpcykuaHRtbCgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMubW9kZWwuc2V0KHtlZGl0czogZWRpdHN9LCB7c2lsZW50OiB0cnVlfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICB9XG5cbn0pO1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIG5hbWU6ICdkZWZhdWx0JyxcblxuICBzZXJ2aWNlUHJvdG90eXBlczoge1xuICAgICdCaW5kZXInOiByZXF1aXJlKCcuL0JpbmRlcicpLFxuICAgICdDb21tYW5kRW1pdHRlcic6IHJlcXVpcmUoJy4vRWRpdG9yL0NvbW1hbmQvQ29tbWFuZEVtaXR0ZXInKSxcbiAgICAnQ29udGV4dENvbGxlY3Rpb24nOiByZXF1aXJlKCcuL0NvbGxlY3Rpb25zL0NvbnRleHRDb2xsZWN0aW9uJyksXG4gICAgJ0NvbnRleHRMaXN0ZW5lcic6IHJlcXVpcmUoJy4vQ29udGV4dC9Db250ZXh0TGlzdGVuZXInKSxcbiAgICAnQ29udGV4dFJlc29sdmVyJzogcmVxdWlyZSgnLi9Db250ZXh0L0NvbnRleHRSZXNvbHZlcicpLFxuICAgICdFZGl0QnVmZmVySXRlbVJlZkZhY3RvcnknOiByZXF1aXJlKCcuL0VkaXRCdWZmZXIvRWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5JyksXG4gICAgJ0VkaXRCdWZmZXJNZWRpYXRvcic6IHJlcXVpcmUoJy4vRWRpdEJ1ZmZlci9FZGl0QnVmZmVyTWVkaWF0b3InKSxcbiAgICAnRWRpdG9yQ29sbGVjdGlvbic6IHJlcXVpcmUoJy4vQ29sbGVjdGlvbnMvRWRpdG9yQ29sbGVjdGlvbicpLFxuICAgICdFbGVtZW50RmFjdG9yeSc6IHJlcXVpcmUoJy4vRWxlbWVudC9FbGVtZW50RmFjdG9yeScpLFxuICAgICdTY2hlbWFDb2xsZWN0aW9uJzogcmVxdWlyZSgnLi9Db2xsZWN0aW9ucy9TY2hlbWFDb2xsZWN0aW9uJyksXG4gICAgJ1N5bmNBY3Rpb25EaXNwYXRjaGVyJzogcmVxdWlyZSgnLi9TeW5jQWN0aW9uL1N5bmNBY3Rpb25EaXNwYXRjaGVyJyksXG4gICAgJ1N5bmNBY3Rpb25SZXNvbHZlcic6IHJlcXVpcmUoJy4vU3luY0FjdGlvbi9TeW5jQWN0aW9uUmVzb2x2ZXInKSxcbiAgICAnV2lkZ2V0RmFjdG9yeSc6IHJlcXVpcmUoJy4vRWRpdG9yL1dpZGdldC9XaWRnZXRGYWN0b3J5JyksXG4gICAgJ1dpZGdldFN0b3JlJzogcmVxdWlyZSgnLi9FZGl0b3IvV2lkZ2V0L1dpZGdldFN0b3JlJyksXG4gICAgJ1dpZGdldFZpZXdGYWN0b3J5JzogcmVxdWlyZSgnLi9FZGl0b3IvV2lkZ2V0L1dpZGdldFZpZXdGYWN0b3J5JyksXG4gICAgJ0VkaXRvclZpZXcnOiByZXF1aXJlKCcuL1ZpZXdzL0VkaXRvclZpZXcnKSxcbiAgfSxcblxuICB2aWV3czoge1xuICAgICdlZGl0b3InOiB7XG4gICAgICBwcm90b3R5cGU6IHJlcXVpcmUoJy4vVmlld3MvV2lkZ2V0RWRpdG9yVmlldycpLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9UZW1wbGF0ZXMvV2lkZ2V0RWRpdG9yVmlld1RlbXBsYXRlJyksXG4gICAgICB9XG4gICAgfSxcbiAgICAnZXhwb3J0Jzoge1xuICAgICAgcHJvdG90eXBlOiByZXF1aXJlKCcuL1ZpZXdzL1dpZGdldE1lbWVudG9WaWV3JyksXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIHRlbXBsYXRlOiByZXF1aXJlKCcuL1RlbXBsYXRlcy9XaWRnZXRNZW1lbnRvVmlld1RlbXBsYXRlJyksXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG5cbiAgcGx1Z2luczoge1xuICAgIGFkYXB0ZXI6IHt9LFxuICAgIHByb3RvY29sOiB7fSxcbiAgfSxcblxuICBlbGVtZW50czoge1xuICAgICd3aWRnZXQnOiB7XG4gICAgICB0YWc6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnZGF0YS11dWlkJzogJzx1dWlkPicsXG4gICAgICAgICdkYXRhLWNvbnRleHQtaGludCc6ICc8Y29udGV4dD4nLFxuICAgICAgICAnZGF0YS12aWV3bW9kZSc6ICc8dmlld21vZGU+JyxcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItd2lkZ2V0J1xuICAgICAgfSxcbiAgICAgIHNlbGVjdG9yOiAnLndpZGdldC1iaW5kZXItd2lkZ2V0W2RhdGEtY29udGV4dC1oaW50XScsXG4gICAgfSxcbiAgICAnZmllbGQnOiB7XG4gICAgICB0YWc6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnZGF0YS1maWVsZC1uYW1lJzogJzxuYW1lPicsXG4gICAgICAgICdkYXRhLWNvbnRleHQnOiAnPGNvbnRleHQ+JyxcbiAgICAgICAgJ2RhdGEtbXV0YWJsZSc6ICc8ZWRpdGFibGU+JyxcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItZmllbGQnXG4gICAgICB9LFxuICAgICAgc2VsZWN0b3I6ICcud2lkZ2V0LWJpbmRlci1maWVsZFtkYXRhLW11dGFibGU9XCJ0cnVlXCJdJyxcbiAgICB9LFxuICAgICd3aWRnZXQtZGlzcGxheSc6IHtcbiAgICAgIHRhZzogJ2RpdicsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICdjbGFzcyc6ICd3aWRnZXQtYmluZGVyLXdpZGdldF9fZGlzcGxheScsXG4gICAgICB9XG4gICAgfSxcbiAgICAndG9vbGJhcic6IHtcbiAgICAgIHRhZzogJ3VsJyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItdG9vbGJveCcsXG4gICAgICB9XG4gICAgfSxcbiAgICAndG9vbGJhci1pdGVtJzoge1xuICAgICAgdGFnOiAnbGknLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnY2xhc3MnOiAnd2lkZ2V0LWJpbmRlci10b29sYm94X19pdGVtJyxcbiAgICAgIH1cbiAgICB9LFxuICAgICd3aWRnZXQtY29tbWFuZCc6IHtcbiAgICAgIHRhZzogJ2EnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnY2xhc3MnOiAnd2lkZ2V0LWJpbmRlci1jb21tYW5kJyxcbiAgICAgICAgJ2RhdGEtY29tbWFuZCc6ICc8Y29tbWFuZD4nLFxuICAgICAgICAnaHJlZic6ICcjJyxcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZGF0YToge1xuICAgIGNvbnRleHQ6IHt9LFxuICAgIHNjaGVtYToge30sXG4gIH1cbn07XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIHBhY2thZ2UgZm9yIG1hbmFnaW5nIHNlcnZlciAvIGNsaWVudCBkYXRhIGJpbmRpbmcgZm9yIGVkaXRvciB3aWRnZXRzLiBcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICAgICQgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gIGlmICghY29uZmlnKSB7XG4gICAgY29uZmlnID0ge307XG4gIH1cbiAgdGhpcy5faW5pdGlhbGl6ZShjb25maWcpO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMsIHtcbiAgZGVmYXVsdHM6IHJlcXVpcmUoJy4vY29uZmlnJyksXG4gIFBsdWdpbkludGVyZmFjZToge1xuICAgIEVkaXRvckFkYXB0ZXI6IHJlcXVpcmUoJy4vUGx1Z2lucy9FZGl0b3JBZGFwdGVyJyksXG4gICAgU3luY1Byb3RvY29sOiByZXF1aXJlKCcuL1BsdWdpbnMvU3luY1Byb3RvY29sJyksXG4gIH0sXG4gIGNvbmZpZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlZmF1bHRzID0gbW9kdWxlLmV4cG9ydHMuZGVmYXVsdHM7XG4gICAgdmFyIGNvbmZpZyA9IHt9O1xuICAgIGNvbmZpZy5zZXJ2aWNlUHJvdG90eXBlcyA9IHt9O1xuICAgIF8uZGVmYXVsdHMoY29uZmlnLnNlcnZpY2VQcm90b3R5cGVzLCBkZWZhdWx0cy5zZXJ2aWNlUHJvdG90eXBlcyk7XG4gICAgY29uZmlnLnZpZXdzID0ge307XG4gICAgXy5lYWNoKGRlZmF1bHRzLnZpZXdzLCBmdW5jdGlvbihkZWYsIG5hbWUpIHtcbiAgICAgIGNvbmZpZy52aWV3c1tuYW1lXSA9IHsgb3B0aW9uczoge30gfTtcbiAgICAgIF8uZGVmYXVsdHMoY29uZmlnLnZpZXdzW25hbWVdLm9wdGlvbnMsIGRlZi5vcHRpb25zKTtcbiAgICAgIF8uZGVmYXVsdHMoY29uZmlnLnZpZXdzW25hbWVdLCBkZWYpO1xuICAgIH0pO1xuICAgIGNvbmZpZy5wbHVnaW5zID0ge307XG4gICAgXy5kZWZhdWx0cyhjb25maWcucGx1Z2lucywgZGVmYXVsdHMucGx1Z2lucyk7XG4gICAgJC5leHRlbmQodHJ1ZSwgY29uZmlnLmVsZW1lbnRzLCBkZWZhdWx0cy5lbGVtZW50cyk7XG4gICAgY29uZmlnLmRhdGEgPSB7fTtcbiAgICBfLmRlZmF1bHRzKGNvbmZpZy5kYXRhLCBkZWZhdWx0cy5kYXRhKTtcbiAgICBfLmRlZmF1bHRzKGNvbmZpZywgZGVmYXVsdHMpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn0pO1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICovXG4gIGdldEluc3RhbmNlTmFtZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dsb2JhbFNldHRpbmdzLm5hbWU7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRFbGVtZW50RmFjdG9yeTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VsZW1lbnRGYWN0b3J5O1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0Q29udGV4dHM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbjtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldFNjaGVtYTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NjaGVtYUNvbGxlY3Rpb247XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRFZGl0b3JzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fZWRpdG9yQ29sbGVjdGlvbjtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldFN5bmNBY3Rpb25EaXNwYXRjaGVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3luY0FjdGlvbkRpc3BhdGNoZXI7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRTeW5jQWN0aW9uUmVzb2x2ZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zeW5jQWN0aW9uUmVzb2x2ZXI7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBvcGVuOiBmdW5jdGlvbigkZWRpdG9yRWwpIHtcbiAgICAkZWRpdG9yRWwuYWRkQ2xhc3MoJ3dpZGdldC1iaW5kZXItb3BlbicpO1xuXG4gICAgdmFyIGVkaXRvckNvbnRleHQgPSB0aGlzLl9jcmVhdGVDb250ZXh0UmVzb2x2ZXIoKS5yZXNvbHZlVGFyZ2V0Q29udGV4dCgkZWRpdG9yRWwpO1xuICAgIHZhciBlZGl0b3JDb250ZXh0SWQgPSBlZGl0b3JDb250ZXh0ID8gZWRpdG9yQ29udGV4dC5nZXQoJ2lkJykgOiBudWxsO1xuICAgIHZhciBlZGl0b3JNb2RlbDtcbiAgICBpZiAoZWRpdG9yQ29udGV4dElkKSB7XG4gICAgICBpZiAoIXRoaXMuX2VkaXRvckNvbGxlY3Rpb24uZ2V0KGVkaXRvckNvbnRleHRJZCkpIHtcbiAgICAgICAgdmFyIGNvbnRleHRSZXNvbHZlciA9IHRoaXMuX2NyZWF0ZUNvbnRleHRSZXNvbHZlcihlZGl0b3JDb250ZXh0KTtcbiAgICAgICAgdmFyIGNvbW1hbmRFbWl0dGVyID0gdGhpcy5fY3JlYXRlU2VydmljZSgnQ29tbWFuZEVtaXR0ZXInLCB0aGlzLl9zeW5jQWN0aW9uRGlzcGF0Y2hlciwgZWRpdG9yQ29udGV4dCk7XG4gICAgICAgIHZhciBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnkgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdFZGl0QnVmZmVySXRlbVJlZkZhY3RvcnknLCBjb250ZXh0UmVzb2x2ZXIsIGNvbW1hbmRFbWl0dGVyKTtcblxuICAgICAgICAvLyBTZXR1cCBhIGNvbnRleHQgbGlzdGVuZXIgZm9yIHJlY2lldmluZyBidWZmZXIgaXRlbSBhcnJpdmFsXG4gICAgICAgIC8vIG5vdGlmaWNhdGlvbnMsIGFuZCBhIGNvbnRleHQgcmVzb2x2ZXIgZm9yIGRldGVybWluaW5nIHdoaWNoXG4gICAgICAgIC8vIGNvbnRleHQocykgYW4gZWxlbWVudCBpcyBhc3NvY2lhdGVkIHdpdGguXG4gICAgICAgIHZhciBjb250ZXh0TGlzdGVuZXIgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdDb250ZXh0TGlzdGVuZXInKTtcbiAgICAgICAgY29udGV4dExpc3RlbmVyLmFkZENvbnRleHQoZWRpdG9yQ29udGV4dCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGZhY3RvcmllcyBmb3IgZ2VuZXJhdGluZyBtb2RlbHMgYW5kIHZpZXdzLlxuICAgICAgICB2YXIgYWRhcHRlciA9IHRoaXMuX2dsb2JhbFNldHRpbmdzLnBsdWdpbnMuYWRhcHRlcjtcbiAgICAgICAgaWYgKHR5cGVvZiBhZGFwdGVyLmNyZWF0ZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgYWRhcHRlciA9IGFkYXB0ZXIuY3JlYXRlLmFwcGx5KGFkYXB0ZXIsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgYSB2aWV3IGZhY3RvcnkgZm9yIGdlbmVyYXRpbmcgd2lkZ2V0IHZpZXdzLlxuICAgICAgICB2YXIgdmlld0ZhY3RvcnkgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdXaWRnZXRWaWV3RmFjdG9yeScsIHRoaXMuX2VsZW1lbnRGYWN0b3J5LCBhZGFwdGVyKTtcbiAgICAgICAgZm9yICh2YXIgdHlwZSBpbiB0aGlzLl9nbG9iYWxTZXR0aW5ncy52aWV3cykge1xuICAgICAgICAgIHZpZXdGYWN0b3J5LnJlZ2lzdGVyKHR5cGUsIHRoaXMuX2dsb2JhbFNldHRpbmdzLnZpZXdzW3R5cGVdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB1dWlkQXR0cmlidXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ3dpZGdldCcpLmdldEF0dHJpYnV0ZU5hbWUoJzx1dWlkPicpO1xuICAgICAgICB2YXIgd2lkZ2V0RmFjdG9yeSA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ1dpZGdldEZhY3RvcnknLCBjb250ZXh0UmVzb2x2ZXIsIGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeSwgdXVpZEF0dHJpYnV0ZSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGEgdGFibGUgZm9yIHN0b3Jpbmcgd2lkZ2V0IGluc3RhbmNlcyBhbmQgYSB0cmFja2VyIHRyYWNrZXIgZm9yXG4gICAgICAgIC8vIG1haW50YWluaW5nIHRoZSB0YWJsZSBiYXNlZCBvbiB0aGUgZWRpdG9yIHN0YXRlLlxuICAgICAgICB2YXIgd2lkZ2V0U3RvcmUgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdXaWRnZXRTdG9yZScsIGFkYXB0ZXIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhIG1lZGlhdG9yIGZvciBjb250cm9sbGluZyBpbnRlcmFjdGlvbnMgYmV0d2VlbiB0aGUgd2lkZ2V0XG4gICAgICAgIC8vIHRhYmxlIGFuZCB0aGUgZWRpdCBidWZmZXIuXG4gICAgICAgIHZhciBlZGl0QnVmZmVyTWVkaWF0b3IgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdFZGl0QnVmZmVyTWVkaWF0b3InLCBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnksIHRoaXMuX2VsZW1lbnRGYWN0b3J5LCBjb250ZXh0TGlzdGVuZXIsIGFkYXB0ZXIsIGNvbnRleHRSZXNvbHZlcik7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBlZGl0b3IgbW9kZWwgYW5kIHJldHVybiBpdCB0byB0aGUgY2FsbGVyLlxuICAgICAgICBlZGl0b3JNb2RlbCA9IG5ldyB0aGlzLl9nbG9iYWxTZXR0aW5ncy5zZXJ2aWNlUHJvdG90eXBlcy5FZGl0b3JDb2xsZWN0aW9uLnByb3RvdHlwZS5tb2RlbCh7XG4gICAgICAgICAgaWQ6IGVkaXRvckNvbnRleHRJZCxcbiAgICAgICAgfSwge1xuICAgICAgICAgIHdpZGdldEZhY3Rvcnk6IHdpZGdldEZhY3RvcnksXG4gICAgICAgICAgdmlld0ZhY3Rvcnk6IHZpZXdGYWN0b3J5LFxuICAgICAgICAgIHdpZGdldFN0b3JlOiB3aWRnZXRTdG9yZSxcbiAgICAgICAgICBlZGl0QnVmZmVyTWVkaWF0b3I6IGVkaXRCdWZmZXJNZWRpYXRvcixcbiAgICAgICAgICBjb250ZXh0OiBlZGl0b3JDb250ZXh0LFxuICAgICAgICAgIGNvbnRleHRSZXNvbHZlcjogY29udGV4dFJlc29sdmVyLFxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGVkaXRvclZpZXcgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdFZGl0b3JWaWV3Jywge1xuICAgICAgICAgIG1vZGVsOiBlZGl0b3JNb2RlbCxcbiAgICAgICAgICBlbDogJGVkaXRvckVsWzBdLFxuICAgICAgICB9LCB7XG4gICAgICAgICAgZWxlbWVudEZhY3Rvcnk6IHRoaXMuX2VsZW1lbnRGYWN0b3J5LFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fZWRpdG9yQ29sbGVjdGlvbi5zZXQoZWRpdG9yTW9kZWwpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdCaW5kZXInLCBlZGl0b3JWaWV3KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4aXN0aW5nIGJpbmRlciBhbHJlYWR5IG9wZW4gZm9yIHRoaXMgZWRpdG9yIGluc3RhbmNlLicpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICovXG4gIF9pbml0aWFsaXplOiBmdW5jdGlvbihjb25maWcpIHtcbiAgICB0aGlzLl9nbG9iYWxTZXR0aW5ncyA9IF8uZGVmYXVsdHMoY29uZmlnLCBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0cyk7XG5cbiAgICB2YXIgcHJvdG9jb2wgPSB0aGlzLl9nbG9iYWxTZXR0aW5ncy5wbHVnaW5zLnByb3RvY29sO1xuICAgIGlmICh0eXBlb2YgcHJvdG9jb2wuY3JlYXRlID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHByb3RvY29sID0gcHJvdG9jb2wuY3JlYXRlLmFwcGx5KHByb3RvY29sLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSB0aGUgYWN0aW9uIGRpc3BhdGNoZXIgLyByZXNvbHV0aW9uIHNlcnZpY2VzIGZvciBoYW5kbGluZyBzeW5jaW5nXG4gICAgLy8gZGF0YSB3aXRoIHRoZSBzZXJ2ZXIuXG4gICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyID0gdGhpcy5fY3JlYXRlU2VydmljZSgnU3luY0FjdGlvblJlc29sdmVyJyk7XG4gICAgdGhpcy5fc3luY0FjdGlvbkRpc3BhdGNoZXIgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdTeW5jQWN0aW9uRGlzcGF0Y2hlcicsIHByb3RvY29sLCB0aGlzLl9zeW5jQWN0aW9uUmVzb2x2ZXIpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSB0b3AgbGV2ZWwgY29sbGVjdGlvbnMgdGhhdCBhcmUgc2hhcmVkIGFjcm9zcyBlZGl0b3IgaW5zdGFuY2VzLlxuICAgIHZhciBlZGl0b3JDb2xsZWN0aW9uID0gdGhpcy5fY3JlYXRlU2VydmljZSgnRWRpdG9yQ29sbGVjdGlvbicpO1xuICAgIHZhciBjb250ZXh0Q29sbGVjdGlvbiA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ0NvbnRleHRDb2xsZWN0aW9uJyk7XG4gICAgdmFyIHNjaGVtYUNvbGxlY3Rpb24gPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdTY2hlbWFDb2xsZWN0aW9uJywgW10sIHtcbiAgICAgIGNvbnRleHRDb2xsZWN0aW9uOiBjb250ZXh0Q29sbGVjdGlvbixcbiAgICAgIGRpc3BhdGNoZXI6IHRoaXMuX3N5bmNBY3Rpb25EaXNwYXRjaGVyLFxuICAgIH0pO1xuICAgIHRoaXMuX2VkaXRvckNvbGxlY3Rpb24gPSBlZGl0b3JDb2xsZWN0aW9uO1xuICAgIHRoaXMuX2NvbnRleHRDb2xsZWN0aW9uID0gY29udGV4dENvbGxlY3Rpb247XG4gICAgdGhpcy5fc2NoZW1hQ29sbGVjdGlvbiA9IHNjaGVtYUNvbGxlY3Rpb247XG5cbiAgICAvLyBTZXQgdXAgdGhlIGNvbGxlY3Rpb25zIHRoYXQgdGhlIHN5bmMgYWN0aW9uIHJlc29sdmVyIHNob3VsZCB3YXRjaCBmb3JcbiAgICAvLyB1cGRhdGVzIHRvLlxuICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5hZGRDb2xsZWN0aW9uKCdjb250ZXh0JywgdGhpcy5fY29udGV4dENvbGxlY3Rpb24pO1xuICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5hZGRDb2xsZWN0aW9uKCdzY2hlbWEnLCB0aGlzLl9zY2hlbWFDb2xsZWN0aW9uKTtcbiAgICB0aGlzLl9zeW5jQWN0aW9uUmVzb2x2ZXIuYWRkQ29sbGVjdGlvbignZWRpdEJ1ZmZlckl0ZW0nLCBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgICByZXR1cm4gY29udGV4dENvbGxlY3Rpb24uZ2V0KGF0dHJpYnV0ZXMuY29udGV4dElkKS5lZGl0QnVmZmVyO1xuICAgIH0pO1xuICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5hZGRDb2xsZWN0aW9uKCd3aWRnZXQnLCBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgICB2YXIgd2lkZ2V0U3RvcmUgPSBlZGl0b3JDb2xsZWN0aW9uLmdldChhdHRyaWJ1dGVzLmVkaXRvckNvbnRleHRJZCkud2lkZ2V0U3RvcmU7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgcmV0dXJuIHdpZGdldFN0b3JlLmdldChpZCkubW9kZWw7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZDogZnVuY3Rpb24oYXR0cmlidXRlcykge1xuICAgICAgICAgIHJldHVybiB3aWRnZXRTdG9yZS5hZGQoYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgYW4gZWxlbWVudCBmYWN0b3J5IHRvIHByb3ZpZGUgYSBnZW5lcmljIHdheSB0byBjcmVhdGUgbWFya3VwLlxuICAgIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gdGhpcy5fY3JlYXRlU2VydmljZSgnRWxlbWVudEZhY3RvcnknLCB0aGlzLl9nbG9iYWxTZXR0aW5ncy5lbGVtZW50cyk7XG5cbiAgICAvLyBMb2FkIGFueSBpbml0aWFsIG1vZGVscy5cbiAgICBpZiAoY29uZmlnLmRhdGEpIHtcbiAgICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5yZXNvbHZlKGNvbmZpZy5kYXRhKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBfY3JlYXRlQ29udGV4dFJlc29sdmVyOiBmdW5jdGlvbihlZGl0b3JDb250ZXh0KSB7XG4gICAgdmFyIHNvdXJjZUNvbnRleHRBdHRyaWJ1dGUgPSB0aGlzLl9lbGVtZW50RmFjdG9yeS5nZXRUZW1wbGF0ZSgnd2lkZ2V0JykuZ2V0QXR0cmlidXRlTmFtZSgnPGNvbnRleHQ+Jyk7XG4gICAgdmFyIHRhcmdldENvbnRleHRBdHRyaWJ1dGUgPSB0aGlzLl9lbGVtZW50RmFjdG9yeS5nZXRUZW1wbGF0ZSgnZmllbGQnKS5nZXRBdHRyaWJ1dGVOYW1lKCc8Y29udGV4dD4nKTtcbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlU2VydmljZSgnQ29udGV4dFJlc29sdmVyJywgdGhpcy5fY29udGV4dENvbGxlY3Rpb24sIHNvdXJjZUNvbnRleHRBdHRyaWJ1dGUsIHRhcmdldENvbnRleHRBdHRyaWJ1dGUsIGVkaXRvckNvbnRleHQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2VydmljZSBiYXNlZCBvbiB0aGUgY29uZmlndXJlZCBwcm90b3R5cGUuXG4gICAqXG4gICAqIFNlcnZpY2UgbmFtZXMgYXJlIHRoZSBzYW1lIGFzIGNsYXNzIG5hbWVzLiBXZSBvbmx5IHN1cHBvcnQgc2VydmljZXMgd2l0aCB1cFxuICAgKiB0byBmaXZlIGFyZ3VtZW50c1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiAgIFRoZSBuYW1lIG9mIHRoZSBzZXJ2aWNlIHRvIGJlIGNyZWF0ZWQuIFRoaXMgaXMgdGhlIGRlZmF1bHQgY2xhc3MgbmFtZS5cbiAgICpcbiAgICogQHJldHVybiB7b2JqZWN0fVxuICAgKiAgIFRoZSBjcmVhdGVkIHNlcnZpY2UuIE5vdGUgdGhhdCBhIG5ldyBzZXJ2aWNlIHdpbGwgYmUgY3JlYXRlZCBlYWNoIHRpbWVcbiAgICogICB0aGlzIG1ldGhvZCBpcyBjYWxsZWQuIE5vIHN0YXRpYyBjYWNoaW5nIGlzIHBlcmZvcm1lZC5cbiAgICovXG4gIF9jcmVhdGVTZXJ2aWNlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgLy8gQWxsIGFyZ3VtZW50cyB0aGF0IGZvbGxvdyB0aGUgJ25hbWUnIGFyZ3VtZW50IGFyZSBpbmplY3RlZCBhc1xuICAgIC8vIGRlcGVuZGVuY2llcyBpbnRvIHRoZSBjcmVhdGVkIG9iamVjdC5cbiAgICB2YXIgYXJncyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgICB9XG5cbiAgICAvLyBXZSBleHBsaWNpdGx5IGNhbGwgdGhlIGNvbnN0cnVjdG9yIGhlcmUgaW5zdGVhZCBvZiBkb2luZyBzb21lIGZhbmN5IG1hZ2ljXG4gICAgLy8gd2l0aCB3cmFwcGVyIGNsYXNzZXMgaW4gb3JkZXIgdG8gaW5zdXJlIHRoYXQgdGhlIGNyZWF0ZWQgb2JqZWN0IGlzXG4gICAgLy8gYWN0dWFsbHkgYW4gaW5zdGFuY2VvZiB0aGUgcHJvdG90eXBlLlxuICAgIHZhciBwcm90b3R5cGUgPSB0aGlzLl9nbG9iYWxTZXR0aW5ncy5zZXJ2aWNlUHJvdG90eXBlc1tuYW1lXTtcbiAgICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHJldHVybiBuZXcgcHJvdG90eXBlKCk7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHJldHVybiBuZXcgcHJvdG90eXBlKGFyZ3NbMF0pO1xuICAgICAgY2FzZSAyOlxuICAgICAgICByZXR1cm4gbmV3IHByb3RvdHlwZShhcmdzWzBdLCBhcmdzWzFdKTtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcmV0dXJuIG5ldyBwcm90b3R5cGUoYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSk7XG4gICAgICBjYXNlIDQ6XG4gICAgICAgIHJldHVybiBuZXcgcHJvdG90eXBlKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0sIGFyZ3NbM10pO1xuICAgICAgY2FzZSA1OlxuICAgICAgICByZXR1cm4gbmV3IHByb3RvdHlwZShhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdLCBhcmdzWzNdLCBhcmdzWzRdKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVhbGx5LCB5b3UgbmVlZCB0byBpbmplY3QgbW9yZSB0aGFuIGZpdmUgc2VydmljZXM/IENvbnNpZGVyIGZhY3RvcmluZyAnICsgbmFtZSArICcgaW50byBzZXBhcmF0ZSBjbGFzc2VzLicpO1xuICAgIH1cbiAgfVxuXG59KTtcbiJdfQ==
