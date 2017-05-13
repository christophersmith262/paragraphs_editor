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
  WidgetBinder = require('widget-binder');

module.exports = SyncProtocol.extend({

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

    if ('targetContext' in command) {
      path += '/' + command.targetContext;
    }

    if ('sourceContext' in command) {
      path += '/' + command.sourceContext;
    }

    if ('paragraph' in command) {
      path += '/' + command.paragraph;
    }

    if ('widget' in command) {
      path += '/' + command.widget;
    }

    if ('bundleName' in command) {
      path += '/' + command.bundleName;
    }

    var params = [];
    for (var key in settings) {
      params.push('settings[' + key + ']=' + settings[key]);
    }
    path += '?' + params.join('&');

    var ajax = Drupal.ajax({
      url: path,
      progress: {
        message: "",
      },
    });

    ajax.options.data['editorContext'] = this._editorContext.get('id');

    if (command.edits) {
      ajax.options.data['nested_contexts'] = _.keys(command.edits);
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

var Drupal = window.Drupal    ,
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
  $.fn.paragraphsEditor.widgetBinder.getSyncActionResolver().resolve(response);
}

/**
 * Theme function for generating paragraphs editor widgets.
 *
 * @return {string}
 *   A string representing a DOM fragment.
 */
Drupal.theme.paragraphsEditorWidget = function(elementFactory, markup) {
  return WidgetBinder.defaults.views['editor'].options.template(elementFactory, markup);
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

Drupal.paragraphs_editor.register = function(module_name, adapter) {
  var config = _.extend({}, WidgetBinder.defaults);

  config.plugins = {
    adapter: adapter,
    protocol: new WidgetBindingProtocol(),
  };

  config.elements.widget = {
    tag: 'paragraph',
    attributes: {
      'data-uuid': '<uuid>',
      'data-context-hint': '<context>',
      'data-viewmode': '<viewmode>',
    }
  };

  config.elements.field = {
    tag: 'paragraph-field',
    attributes: {
      'data-field-name': '<field>',
      'data-context': '<context>',
      'data-mutable': '<editable>',
    },
    selector: 'paragraph-field,.paragraph-field-marker',
  };

  config.views['editor'].options.template = Drupal.theme.paragraphsEditorWidget;
  config.views['export'].options.template = Drupal.theme.paragraphsEditorExport;

  return this.instances[module_name] = new WidgetBinder(config);
}

},{"./BundleSelector":1,"./WidgetBindingProtocol":2,"widget-binder":36}],4:[function(require,module,exports){
var _ = window._             ,
  $ = window.jQuery    ;

module.exports = function(editorModel) {
  this._editorModel = editorModel;
  this._widgetFactory = editorModel.widgetFactory;
  this._viewFactory = editorModel.viewFactory;
  this._widgetStore = editorModel.widgetStore;
  this._editBufferMediator = editorModel.editBufferMediator;
  this._editBufferMediator = editorModel.editBufferMediator;
}

_.extend(module.exports.prototype, {

  /**
   * Requests that a new widget be inserted.
   *
   * @param {jQuery} $targetEl
   *   The element that the new widget will be inserted into.
   * @param {string} bundleName
   *   The type of item to request.
   */
  create: function($targetEl, bundleName) {
    this._editBufferMediator.requestBufferItem(bundleName, $targetEl);
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
  get: function(id) {
    return this._widgetStore.get(id).model;
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
    this._editorModel.destroy();
    this._widgetStore.cleanup();
    this._editBufferMediator.cleanup();
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

},{}],5:[function(require,module,exports){
/**
 * @file
 * A Backbone collection of schema models.
 */

'use strict';

var Backbone = window.Backbone    ,
  EditBufferItemCollection = require('./EditBufferItemCollection'),
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
        var editBuffer = new EditBufferItemCollection([], { contextId: contextString });
        var model = new ContextModel({ id: contextString }, { editBuffer: editBuffer, settings: settings });
        this.add(model);
      }
    }
    return Backbone.Collection.prototype.get.call(this, contextString);
  },

  /**
   */
  touch: function(contextString) {
    this.get(contextString);
  },

});

},{"../Models/ContextModel":21,"./EditBufferItemCollection":6}],6:[function(require,module,exports){
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
  isAllowed: function(id, bundleName) {
    var model = this.get(id);
    return !!(model && model.get('allowed')[bundleName]);
  },

  /**
   */
  addContextSchema: function(contextModel) {
    var id = contextModel.get('field');
    if (id) {
      this._dispatcher.dispatch('FETCH_SCHEMA', {}, id);
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
    var contextString = $el.attr(this._targetContextAttribute);
    if (!contextString) {
      contextString = $el.closest('[' + this._targetContextAttribute + ']').attr(this._targetContextAttribute);
    }

    return this.get(contextString);
  },

  /**
   */
  resolveSourceContext: function($el) {
    var contextString = $el.attr(this._sourceContextAttribute);
    return contextString ? this.get(contextString) : this._editorContext;
  },

  /**
   */
  getEditorContext: function() {
    return this._editorContext;
  },

  /**
   */
  get: function(contextString) {
    if (contextString) {
      var settings = this._editorContext ? this._editorContext.getSettings() : {};
      return this._contextCollection.get(contextString, settings);
    }
    else {
      return this._editorContext;
    }
  },

  /**
   */
  touch: function(contextString) {
    return this._contextCollection.touch(contextString);
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
  requestBufferItem: function(bundleName, $el) {
    var targetContext = this._contextResolver.resolveTargetContext($el);
    this._contextListener.addContext(targetContext);
    this._editBufferItemRefFactory.requestNewItem(targetContext.get('id'), bundleName);
      
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
   * @param {string} bundleName
   *   The type of item to ie inserted.
   */
  insert: function(targetContextId, bundleName) {
    var options = {
      command: 'insert',
      targetContext: targetContextId,
    };

    if (bundleName) {
      options.bundleName = bundleName;
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
      this.listenTo(widgetModel, 'destroy', this.remove);
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
  get: function(id) {
    var widgetModel = this._widgetCollection.get(id);

    if (widgetModel) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');
      return {
        model: widgetModel,
        view: this._readCell(i, j),
      };
    }

    return {
      model: null,
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

var Backbone = window.Backbone    ;

/**
 */
module.exports = Backbone.Model.extend({

  type: 'Context',

  defaults: {
    field: '',
    settings: {},
  },

  /**
   * {@inheritdoc}
   */
  constructor: function(attributes, options) {
    this.editBuffer = options.editBuffer;
    if (!attributes.settings) {
      attributes.settings = {};
    }
    Backbone.Model.apply(this, [attributes, options]);
  },

  /**
   */
  set: function(attributes, options) {
    if (attributes.editBufferItems) {
      this.editBuffer.add(attributes.editBufferItems, {merge: true});
      delete attributes.editBufferItems;
    }

    return Backbone.Model.prototype.set.call(this, attributes, options);
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

},{}],22:[function(require,module,exports){
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
  isAllowed: function(bundleName) {
    return !!this.get('allowed')[bundleName];
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
     * The data to be sent with the command.
     *
     * @type {int}
     */
    itemId: 0,

    /**
     * The context the widget is in.
     *
     * @type {string}
     */
    contextId: '',

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

    this.set(attributes, {silent: true});
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
        resolvedCollection.add(attributes);
      }
    });
  }

});

},{}],30:[function(require,module,exports){

'use strict';

/**
 */
module.exports = function(elementFactory, markup) {
  var displayElement = elementFactory.create('widget-display');
  var toolbarElement = elementFactory.create('toolbar');
  var toolbarItemElement = elementFactory.create('toolbar-item');
  var commandElement = elementFactory.create('widget-command');

  return displayElement.renderOpeningTag()
    + markup
    + toolbarElement.renderOpeningTag()
      + toolbarItemElement.renderOpeningTag()
        + commandElement.setAttribute('<command>', 'edit').renderOpeningTag() + commandElement.renderClosingTag()
      + toolbarItemElement.renderClosingTag()
      + toolbarItemElement.renderOpeningTag()
        + commandElement.setAttribute('<command>', 'delete').renderOpeningTag() + commandElement.renderClosingTag()
      + toolbarItemElement.renderClosingTag()
    + toolbarElement.renderClosingTag()
  + displayElement.renderClosingTag();
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

    // Set up the change handler.
    this.listenTo(this.model, 'change', this._changeHandler);
  },

  /**
   */
  template: function(elementFactory, markup) {
  },

  /**
   */
  render: function() {
    if (this.model.get('duplicating')) {
      this.$el.html(this.template(this._elementFactory, '...'));
    }
    else {
      var view = this;
      this.$el.html(this.template(this._elementFactory, this.model.get('markup')));

      this.$el.find(this.commandSelector).on('click', function() {
        var command = $(this).attr(view.commandAttribute);

        if (command == 'edit') {
          view.save().edit();
        }
        else if (command == 'remove') {
          view.remove();
        }
      });

      this.renderAttributes();
      this.renderEdits();
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
  renderEdits: function() {
    var edits = this.model.get('edits');
    this._inlineElementVisitor(function($el, contextString, selector) {
      // Fetch the edit and set a data attribute to make associating edits
      // easier for whoever is going to attach the inline editor.
      $el.html(edits[contextString] ? edits[contextString] : '');

      // Tell the widget manager to enable inline editing for this element.
      this.adapter.attachInlineEditing(this, contextString, selector);
    });
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
  rebase: function() {
    var oldEdits = _.pairs(this.model.get('edits'));
    var edits = {};
    this._inlineElementVisitor(function($el, contextString, selector) {
      var next = oldEdits.shift();
      edits[contextString] = next ? next[1] : '';
    });
    this.model.set({edits: edits});

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
    this.$el.find(this.commandSelector).off();
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
    // If the widget is currently asking for a duplicate buffer item from the
    // server, or such a request just finished, we don't want to save the
    // current state of the editor since it is just displaying a 'loading'
    // message.
    if (this.model.previous('duplicating')) {
      this.render().rebase();
    }

    // If the markup changed and the widget wasn't duplicating, we have to
    // re-render everything.
    else if (this.model.get('duplicating') || this.model.hasChanged('markup')) {
      this.render();
    }

    // Otherwise we can just re-render the parts that changed.
    else {
      if (this.model.hasChanged('edits')) {
        this.renderEdits();
      }

      if (this.model.hasChanged('itemId') || this.model.hasChanged('itemContextId')) {
        this.renderAttributes();
      }
    }

    return this;
  },

  /**
   */
  _inlineElementVisitor(callback) {
    var view = this;
    this.$el.find(this.inlineEditorSelector).each(function() {
      if ($(this).closest(view.widgetSelector).is(view.$el)) {
        var contextString = $(this).attr(view.inlineContextAttribute);
        var selector = view.inlineEditorSelector + '[' + view.inlineContextAttribute + '="' + contextString + '"]';
        callback.call(view, $(this), contextString, selector);
      }
    });
  }

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
      var contextString = $(this).attr(view.inlineContextAttribute);
      edits[contextString] = $(this).html();
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
    adapter: null,
    protocol: null,
  },

  elements: {
    'widget': {
      tag: 'div',
      attributes: {
        'data-uuid': '<uuid>',
        'data-context-hint': '<context>',
        'data-viewmode': '<viewmode>',
        'class': 'widget-binder-widget'
      }
    },
    'field': {
      tag: 'div',
      attributes: {
        'data-field-name': '<field>',
        'data-context': '<context>',
        'data-mutable': '<editable>',
        'class': 'widget-binder-field'
      }
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

var _ = window._             ;

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
  getViewFactory: function() {
    return this._viewFactory;
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
          viewFactory: this._viewFactory,
          widgetStore: widgetStore,
          editBufferMediator: editBufferMediator,
          context: editorContext,
        });
        this._createService('EditorView', {
          model: editorModel,
          el: $editorEl[0],
        }, {
          elementFactory: this._elementFactory,
        });
        this._editorCollection.set(editorModel);

        return this._createService('Binder', editorModel, editBufferMediator);
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

    // Create the action dispatcher / resolution services for handling syncing
    // data with the server.
    this._syncActionResolver = this._createService('SyncActionResolver');
    this._syncActionDispatcher = this._createService('SyncActionDispatcher', this._globalSettings.plugins.protocol, this._syncActionResolver);

    // Create the top level collections that are shared across editor instances.
    var editorCollection = this._createService('EditorCollection');
    var contextCollection = this._createService('ContextCollection');
    var schemaCollection = this._createService('SchemaCollection', [], {
      contextCollection: contextCollection,
      dispatcher: this._syncActionDispatcher,
    });
    this._editorCollection = schemaCollection;
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
      return editorCollection.get(attributes.contextId).widgetStore;
    });

    // Create an element factory to provide a generic way to create markup.
    this._elementFactory = this._createService('ElementFactory', this._globalSettings.elements);

    // Create a view factory for generating widget views.
    this._viewFactory = this._createService('WidgetViewFactory', this._elementFactory, this._globalSettings.plugins.adapter);
    for (var type in this._globalSettings.views) {
      this._viewFactory.register(type, this._globalSettings.views[type]);
    }

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL2pzL3NyYy9CdW5kbGVTZWxlY3Rvci5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL2pzL3NyYy9XaWRnZXRCaW5kaW5nUHJvdG9jb2wuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9qcy9zcmMvZmFrZV9hNTQyMDY5Ni5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0JpbmRlci5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbGxlY3Rpb25zL0NvbnRleHRDb2xsZWN0aW9uLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvQ29sbGVjdGlvbnMvRWRpdEJ1ZmZlckl0ZW1Db2xsZWN0aW9uLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvQ29sbGVjdGlvbnMvRWRpdG9yQ29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0NvbGxlY3Rpb25zL1NjaGVtYUNvbGxlY3Rpb24uanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Db2xsZWN0aW9ucy9XaWRnZXRDb2xsZWN0aW9uLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvQ29udGV4dC9Db250ZXh0TGlzdGVuZXIuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Db250ZXh0L0NvbnRleHRSZXNvbHZlci5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VkaXRCdWZmZXIvRWRpdEJ1ZmZlckl0ZW1SZWYuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FZGl0QnVmZmVyL0VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeS5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VkaXRCdWZmZXIvRWRpdEJ1ZmZlck1lZGlhdG9yLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdG9yL0NvbW1hbmQvQ29tbWFuZEVtaXR0ZXIuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FZGl0b3IvV2lkZ2V0L1dpZGdldEZhY3RvcnkuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9FZGl0b3IvV2lkZ2V0L1dpZGdldFN0b3JlLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvRWRpdG9yL1dpZGdldC9XaWRnZXRWaWV3RmFjdG9yeS5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VsZW1lbnQvRWxlbWVudC5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL0VsZW1lbnQvRWxlbWVudEZhY3RvcnkuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Nb2RlbHMvQ29udGV4dE1vZGVsLmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvTW9kZWxzL0VkaXRCdWZmZXJJdGVtTW9kZWwuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Nb2RlbHMvRWRpdG9yTW9kZWwuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Nb2RlbHMvU2NoZW1hTW9kZWwuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9Nb2RlbHMvV2lkZ2V0TW9kZWwuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9QbHVnaW5zL0VkaXRvckFkYXB0ZXIuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9QbHVnaW5zL1N5bmNQcm90b2NvbC5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL1N5bmNBY3Rpb24vU3luY0FjdGlvbkRpc3BhdGNoZXIuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9TeW5jQWN0aW9uL1N5bmNBY3Rpb25SZXNvbHZlci5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL1RlbXBsYXRlcy9XaWRnZXRFZGl0b3JWaWV3VGVtcGxhdGUuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9UZW1wbGF0ZXMvV2lkZ2V0TWVtZW50b1ZpZXdUZW1wbGF0ZS5qcyIsIi9Vc2Vycy9jc21pdGgvU2l0ZXMvZHJ1cGFsdm0vY29tcG9uZW50aXplZHJ1cGFsL2RvY3Jvb3QvbW9kdWxlcy9jb250cmliL3BhcmFncmFwaHNfZWRpdG9yL25vZGVfbW9kdWxlcy93aWRnZXQtYmluZGVyL1ZpZXdzL0VkaXRvclZpZXcuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9WaWV3cy9XaWRnZXRFZGl0b3JWaWV3LmpzIiwiL1VzZXJzL2NzbWl0aC9TaXRlcy9kcnVwYWx2bS9jb21wb25lbnRpemVkcnVwYWwvZG9jcm9vdC9tb2R1bGVzL2NvbnRyaWIvcGFyYWdyYXBoc19lZGl0b3Ivbm9kZV9tb2R1bGVzL3dpZGdldC1iaW5kZXIvVmlld3MvV2lkZ2V0TWVtZW50b1ZpZXcuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9jb25maWcuanMiLCIvVXNlcnMvY3NtaXRoL1NpdGVzL2RydXBhbHZtL2NvbXBvbmVudGl6ZWRydXBhbC9kb2Nyb290L21vZHVsZXMvY29udHJpYi9wYXJhZ3JhcGhzX2VkaXRvci9ub2RlX21vZHVsZXMvd2lkZ2V0LWJpbmRlci9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIERydXBhbCBBUEkgaW50ZWdyYXRpb25zIGZvciBwYXJhZ3JhcGhzX2VkaXRvci5cbiAqL1xuXG52YXIgRHJ1cGFsID0gcmVxdWlyZSgnZHJ1cGFsJyksXG4gICQgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuRHJ1cGFsLmJlaGF2aW9ycy5wYXJhZ3JhcGhzX2VkaXRvcl9idW5kbGVzZWxlY3RvciA9IHtcbiAgYXR0YWNoOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgJCgnLnBhcmFncmFwaHMtZWRpdG9yLWJ1bmRsZS1zZWxlY3Rvci1zZWFyY2gnLCBjb250ZXh0KS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRjb250YWluZXIgPSAkKHRoaXMpO1xuICAgICAgdmFyICRpbnB1dCA9ICRjb250YWluZXIuZmluZCgnLnBhcmFncmFwaHMtZWRpdG9yLWJ1bmRsZS1zZWxlY3Rvci1zZWFyY2hfX2lucHV0Jyk7XG4gICAgICB2YXIgJHN1Ym1pdCA9ICRjb250YWluZXIuZmluZCgnLnBhcmFncmFwaHMtZWRpdG9yLWJ1bmRsZS1zZWxlY3Rvci1zZWFyY2hfX3N1Ym1pdCcpO1xuXG4gICAgICAkaW5wdXQua2V5dXAoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAkc3VibWl0Lm1vdXNlZG93bigpO1xuICAgICAgfSkuYmx1cihmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykudHJpZ2dlcignZm9jdXMnKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG4iLCJ2YXIgRHJ1cGFsID0gcmVxdWlyZSgnZHJ1cGFsJyksXG4gIFdpZGdldEJpbmRlciA9IHJlcXVpcmUoJ3dpZGdldC1iaW5kZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTeW5jUHJvdG9jb2wuZXh0ZW5kKHtcblxuICBzZW5kOiBmdW5jdGlvbih0eXBlLCBkYXRhLCBzZXR0aW5ncywgcmVzb2x2ZXIpIHtcbiAgICBpZiAodHlwZSA9PSAnRkVUQ0hfU0NIRU1BJykge1xuICAgICAgdGhpcy5fZ2V0KGRhdGEsIHJlc29sdmVyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9zZW5kQWpheENvbW1hbmQoZGF0YSwgc2V0dGluZ3MsIHJlc29sdmVyKTtcbiAgICB9XG4gIH0sXG5cbiAgX3NlbmRBamF4Q29tbWFuZDogZnVuY3Rpb24oY29tbWFuZCwgc2V0dGluZ3MsIHJlc29sdmVyKSB7XG5cbiAgICBpZiAoIWNvbW1hbmQuY29tbWFuZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9ICcvYWpheC9wYXJhZ3JhcGhzLWVkaXRvci8nICsgY29tbWFuZC5jb21tYW5kO1xuXG4gICAgaWYgKCd0YXJnZXRDb250ZXh0JyBpbiBjb21tYW5kKSB7XG4gICAgICBwYXRoICs9ICcvJyArIGNvbW1hbmQudGFyZ2V0Q29udGV4dDtcbiAgICB9XG5cbiAgICBpZiAoJ3NvdXJjZUNvbnRleHQnIGluIGNvbW1hbmQpIHtcbiAgICAgIHBhdGggKz0gJy8nICsgY29tbWFuZC5zb3VyY2VDb250ZXh0O1xuICAgIH1cblxuICAgIGlmICgncGFyYWdyYXBoJyBpbiBjb21tYW5kKSB7XG4gICAgICBwYXRoICs9ICcvJyArIGNvbW1hbmQucGFyYWdyYXBoO1xuICAgIH1cblxuICAgIGlmICgnd2lkZ2V0JyBpbiBjb21tYW5kKSB7XG4gICAgICBwYXRoICs9ICcvJyArIGNvbW1hbmQud2lkZ2V0O1xuICAgIH1cblxuICAgIGlmICgnYnVuZGxlTmFtZScgaW4gY29tbWFuZCkge1xuICAgICAgcGF0aCArPSAnLycgKyBjb21tYW5kLmJ1bmRsZU5hbWU7XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBzZXR0aW5ncykge1xuICAgICAgcGFyYW1zLnB1c2goJ3NldHRpbmdzWycgKyBrZXkgKyAnXT0nICsgc2V0dGluZ3Nba2V5XSk7XG4gICAgfVxuICAgIHBhdGggKz0gJz8nICsgcGFyYW1zLmpvaW4oJyYnKTtcblxuICAgIHZhciBhamF4ID0gRHJ1cGFsLmFqYXgoe1xuICAgICAgdXJsOiBwYXRoLFxuICAgICAgcHJvZ3Jlc3M6IHtcbiAgICAgICAgbWVzc2FnZTogXCJcIixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBhamF4Lm9wdGlvbnMuZGF0YVsnZWRpdG9yQ29udGV4dCddID0gdGhpcy5fZWRpdG9yQ29udGV4dC5nZXQoJ2lkJyk7XG5cbiAgICBpZiAoY29tbWFuZC5lZGl0cykge1xuICAgICAgYWpheC5vcHRpb25zLmRhdGFbJ25lc3RlZF9jb250ZXh0cyddID0gXy5rZXlzKGNvbW1hbmQuZWRpdHMpO1xuICAgIH1cblxuICAgIHZhciBjb21wbGV0ZSA9IGFqYXgub3B0aW9ucy5jb21wbGV0ZTtcblxuICAgIGFqYXgub3B0aW9ucy5jb21wbGV0ZSA9IGZ1bmN0aW9uICh4bWxodHRwcmVxdWVzdCwgc3RhdHVzKSB7XG4gICAgICBjb21wbGV0ZS5jYWxsKGFqYXgub3B0aW9ucywgeG1saHR0cHJlcXVlc3QsIHN0YXR1cyk7XG4gICAgICBEcnVwYWwuYWpheC5pbnN0YW5jZXMuc3BsaWNlKGFqYXguaW5zdGFuY2VJbmRleCwgMSk7XG4gICAgfVxuXG4gICAgYWpheC5leGVjdXRlKCk7XG4gIH0sXG5cbiAgX2dldDogZnVuY3Rpb24oaWQsIHJlc29sdmVyKSB7XG4gICAgJC5nZXQoJy9hamF4L3BhcmFncmFwaHMtZWRpdG9yL3NjaGVtYS8nICsgaWQsICcnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmVzb2x2ZXIucmVzb2x2ZShyZXNwb25zZSk7XG4gICAgfSk7XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgRHJ1cGFsIEFQSSBpbnRlZ3JhdGlvbnMgZm9yIHBhcmFncmFwaHNfZWRpdG9yLlxuICovXG5cbnZhciBEcnVwYWwgPSByZXF1aXJlKCdkcnVwYWwnKSxcbiAgZHJ1cGFsU2V0dGluZ3MgPSByZXF1aXJlKCdkcnVwYWwtc2V0dGluZ3MnKSxcbiAgJCA9IHJlcXVpcmUoJ2pxdWVyeScpLFxuICBXaWRnZXRCaW5kaW5nUHJvdG9jb2wgPSByZXF1aXJlKCcuL1dpZGdldEJpbmRpbmdQcm90b2NvbCcpO1xuICBXaWRnZXRCaW5kZXIgPSByZXF1aXJlKCd3aWRnZXQtYmluZGVyJyk7XG5cbnJlcXVpcmUoJy4vQnVuZGxlU2VsZWN0b3InKTtcblxuLyoqXG4gKiB7QG5hbWVzcGFjZX1cbiAqL1xuRHJ1cGFsLnBhcmFncmFwaHNfZWRpdG9yID0ge307XG5cbi8qKlxuICogQ29tbWFuZCB0byBwcm9jZXNzIHJlc3BvbnNlIGRhdGEgZnJvbSBwYXJhZ3JhcGhzIGVkaXRvciBjb21tYW5kcy5cbiAqXG4gKiBAcGFyYW0ge0RydXBhbC5BamF4fSBbYWpheF1cbiAqICAge0BsaW5rIERydXBhbC5BamF4fSBvYmplY3QgY3JlYXRlZCBieSB7QGxpbmsgRHJ1cGFsLmFqYXh9LlxuICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlXG4gKiAgIFRoZSByZXNwb25zZSBmcm9tIHRoZSBBamF4IHJlcXVlc3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2UuaWRcbiAqICAgVGhlIG1vZGVsIGlkIGZvciB0aGUgY29tbWFuZCB0aGF0IHdhcyB1c2VkLlxuICovXG5EcnVwYWwuQWpheENvbW1hbmRzLnByb3RvdHlwZS5wYXJhZ3JhcGhzX2VkaXRvcl9kYXRhID0gZnVuY3Rpb24oYWpheCwgcmVzcG9uc2UsIHN0YXR1cyl7XG4gICQuZm4ucGFyYWdyYXBoc0VkaXRvci53aWRnZXRCaW5kZXIuZ2V0U3luY0FjdGlvblJlc29sdmVyKCkucmVzb2x2ZShyZXNwb25zZSk7XG59XG5cbi8qKlxuICogVGhlbWUgZnVuY3Rpb24gZm9yIGdlbmVyYXRpbmcgcGFyYWdyYXBocyBlZGl0b3Igd2lkZ2V0cy5cbiAqXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKiAgIEEgc3RyaW5nIHJlcHJlc2VudGluZyBhIERPTSBmcmFnbWVudC5cbiAqL1xuRHJ1cGFsLnRoZW1lLnBhcmFncmFwaHNFZGl0b3JXaWRnZXQgPSBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgbWFya3VwKSB7XG4gIHJldHVybiBXaWRnZXRCaW5kZXIuZGVmYXVsdHMudmlld3NbJ2VkaXRvciddLm9wdGlvbnMudGVtcGxhdGUoZWxlbWVudEZhY3RvcnksIG1hcmt1cCk7XG59XG5cbi8qKlxuICogVGhlbWUgZnVuY3Rpb24gZm9yIGdlbmVyYXRpbmcgcGFyYWdyYXBocyBlZGl0b3Igd2lkZ2V0cy5cbiAqXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKiAgIEEgc3RyaW5nIHJlcHJlc2VudGluZyBhIERPTSBmcmFnbWVudC5cbiAqL1xuRHJ1cGFsLnRoZW1lLnBhcmFncmFwaHNFZGl0b3JFeHBvcnQgPSBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgZmllbGRzLCBlZGl0cykge1xuICByZXR1cm4gV2lkZ2V0QmluZGVyLmRlZmF1bHRzLnZpZXdzWydleHBvcnQnXS5vcHRpb25zLnRlbXBsYXRlKGVsZW1lbnRGYWN0b3J5LCBmaWVsZHMsIGVkaXRzKTtcbn1cblxuRHJ1cGFsLnBhcmFncmFwaHNfZWRpdG9yLnJlZ2lzdGVyID0gZnVuY3Rpb24obW9kdWxlX25hbWUsIGFkYXB0ZXIpIHtcbiAgdmFyIGNvbmZpZyA9IF8uZXh0ZW5kKHt9LCBXaWRnZXRCaW5kZXIuZGVmYXVsdHMpO1xuXG4gIGNvbmZpZy5wbHVnaW5zID0ge1xuICAgIGFkYXB0ZXI6IGFkYXB0ZXIsXG4gICAgcHJvdG9jb2w6IG5ldyBXaWRnZXRCaW5kaW5nUHJvdG9jb2woKSxcbiAgfTtcblxuICBjb25maWcuZWxlbWVudHMud2lkZ2V0ID0ge1xuICAgIHRhZzogJ3BhcmFncmFwaCcsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgJ2RhdGEtdXVpZCc6ICc8dXVpZD4nLFxuICAgICAgJ2RhdGEtY29udGV4dC1oaW50JzogJzxjb250ZXh0PicsXG4gICAgICAnZGF0YS12aWV3bW9kZSc6ICc8dmlld21vZGU+JyxcbiAgICB9XG4gIH07XG5cbiAgY29uZmlnLmVsZW1lbnRzLmZpZWxkID0ge1xuICAgIHRhZzogJ3BhcmFncmFwaC1maWVsZCcsXG4gICAgYXR0cmlidXRlczoge1xuICAgICAgJ2RhdGEtZmllbGQtbmFtZSc6ICc8ZmllbGQ+JyxcbiAgICAgICdkYXRhLWNvbnRleHQnOiAnPGNvbnRleHQ+JyxcbiAgICAgICdkYXRhLW11dGFibGUnOiAnPGVkaXRhYmxlPicsXG4gICAgfSxcbiAgICBzZWxlY3RvcjogJ3BhcmFncmFwaC1maWVsZCwucGFyYWdyYXBoLWZpZWxkLW1hcmtlcicsXG4gIH07XG5cbiAgY29uZmlnLnZpZXdzWydlZGl0b3InXS5vcHRpb25zLnRlbXBsYXRlID0gRHJ1cGFsLnRoZW1lLnBhcmFncmFwaHNFZGl0b3JXaWRnZXQ7XG4gIGNvbmZpZy52aWV3c1snZXhwb3J0J10ub3B0aW9ucy50ZW1wbGF0ZSA9IERydXBhbC50aGVtZS5wYXJhZ3JhcGhzRWRpdG9yRXhwb3J0O1xuXG4gIHJldHVybiB0aGlzLmluc3RhbmNlc1ttb2R1bGVfbmFtZV0gPSBuZXcgV2lkZ2V0QmluZGVyKGNvbmZpZyk7XG59XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgJCA9IHJlcXVpcmUoJ2pxdWVyeScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVkaXRvck1vZGVsKSB7XG4gIHRoaXMuX2VkaXRvck1vZGVsID0gZWRpdG9yTW9kZWw7XG4gIHRoaXMuX3dpZGdldEZhY3RvcnkgPSBlZGl0b3JNb2RlbC53aWRnZXRGYWN0b3J5O1xuICB0aGlzLl92aWV3RmFjdG9yeSA9IGVkaXRvck1vZGVsLnZpZXdGYWN0b3J5O1xuICB0aGlzLl93aWRnZXRTdG9yZSA9IGVkaXRvck1vZGVsLndpZGdldFN0b3JlO1xuICB0aGlzLl9lZGl0QnVmZmVyTWVkaWF0b3IgPSBlZGl0b3JNb2RlbC5lZGl0QnVmZmVyTWVkaWF0b3I7XG4gIHRoaXMuX2VkaXRCdWZmZXJNZWRpYXRvciA9IGVkaXRvck1vZGVsLmVkaXRCdWZmZXJNZWRpYXRvcjtcbn1cblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIFJlcXVlc3RzIHRoYXQgYSBuZXcgd2lkZ2V0IGJlIGluc2VydGVkLlxuICAgKlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldEVsXG4gICAqICAgVGhlIGVsZW1lbnQgdGhhdCB0aGUgbmV3IHdpZGdldCB3aWxsIGJlIGluc2VydGVkIGludG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBidW5kbGVOYW1lXG4gICAqICAgVGhlIHR5cGUgb2YgaXRlbSB0byByZXF1ZXN0LlxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbigkdGFyZ2V0RWwsIGJ1bmRsZU5hbWUpIHtcbiAgICB0aGlzLl9lZGl0QnVmZmVyTWVkaWF0b3IucmVxdWVzdEJ1ZmZlckl0ZW0oYnVuZGxlTmFtZSwgJHRhcmdldEVsKTtcbiAgfSxcblxuICAvKipcbiAgICogTWFrZXMgd2lkZ2V0IG1hbmFnZXIgYXdhcmUgb2YgYSBuZXdseSBpbnNlcnRlZCB3aWRnZXQuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIG1vc3QgaW1wb3J0YW50IG1ldGhvZCBoZXJlLiBJdCBpcyBjYWxsZWQgd2hlbiBhIG5ldyB3aWRnZXQgaXNcbiAgICogY3JlYXRlZCBpbiB0aGUgZWRpdG9yIGluIG9yZGVyIHRvIGluc3RydWN0IHRoZSBtYW5hZ2VyIHRvIHN0YXJ0IHRyYWNraW5nXG4gICAqIHRoZSBsaWZlY3ljbGUgb2YgdGhlIHdpZGdldCwgaXRzIGRvbSByZXByZXNlbnRhdGlvbiwgYW5kIHRoZSBlZGl0IGJ1ZmZlclxuICAgKiBkYXRhIGl0ZW0gaXQgcmVmZXJlbmNlcy5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gd2lkZ2V0XG4gICAqICAgVGhlIGVkaXRvciByZXByZXNlbnRhdGlvbiBvZiBhIHdpZGdldC4gVGhpcyBjYW4gYmUgYW55IGRhdGEgeW91IHdhbnQgdG9cbiAgICogICBhc3NvY2lhdGUgd2l0aCB0aGUgd2lkZ2V0LCBidXQgd2lsbCB1c3VhbGx5IGJlIGFuIG9iamVjdCBnZW5lcmF0ZWQgYnkgdGhlXG4gICAqICAgZWRpdG9yLiBUaGlzIHdpbGwgYmUgYXZhaWxhYmxlIHRvIHRoZSBlZGl0b3IgYWRhcHRlciBkdXJpbmcgd2lkZ2V0XG4gICAqICAgb3BlcmF0aW9ucy5cbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBBIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgd2lkZ2V0LiBUaGlzIHdpbGwgdXN1YWxseSBiZSBnZW5lcmF0ZWQgYnkgdGhlXG4gICAqICAgZWRpdG9yLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldEVsXG4gICAqICAgVGhlIHJvb3QgZWxlbWVudCBvZiB0aGUgd2lkZ2V0IHdpdGhpbiB0aGUgZWRpdG9yLlxuICAgKi9cbiAgYmluZDogZnVuY3Rpb24od2lkZ2V0LCBpZCwgJHRhcmdldEVsKSB7XG4gICAgLy8gQ3JlYXRlIGEgbW9kZWwgZm9yIHJlcHJlc2VudGluZyB0aGUgd2lkZ2V0LlxuICAgIHZhciB3aWRnZXRNb2RlbCA9IHRoaXMuX3dpZGdldEZhY3RvcnkuY3JlYXRlKHdpZGdldCwgaWQsICR0YXJnZXRFbCk7XG4gICAgdmFyIHRhcmdldENvbnRleHQgPSB3aWRnZXRNb2RlbC5lZGl0QnVmZmVySXRlbVJlZi50YXJnZXRDb250ZXh0O1xuICAgIHZhciBzb3VyY2VDb250ZXh0ID0gd2lkZ2V0TW9kZWwuZWRpdEJ1ZmZlckl0ZW1SZWYuc291cmNlQ29udGV4dDtcblxuICAgIC8vIENyZWF0ZSBhIHdpZGdldCB2aWV3IHRvIHJlbmRlciB0aGUgd2lkZ2V0IHdpdGhpbiBFZGl0b3IuXG4gICAgdmFyIHdpZGdldEVkaXRvclZpZXcgPSB0aGlzLl92aWV3RmFjdG9yeS5jcmVhdGUod2lkZ2V0TW9kZWwsICR0YXJnZXRFbCwgJ2VkaXRvcicpO1xuXG4gICAgLy8gQWRkIHRoZSB3aWRnZXQgdG8gdGhlIHdpZGdldCB0byB0aGUgdGFibGUgdG8ga2VlcCB0cmFjayBvZiBpdC5cbiAgICB0aGlzLl93aWRnZXRTdG9yZS5hZGQod2lkZ2V0TW9kZWwsIHdpZGdldEVkaXRvclZpZXcpO1xuXG4gICAgLy8gSWYgdGhlIHdpZGdldCBpcyBub3QgY3VycmVudGx5IHVzaW5nIHRoZSBlZGl0b3IgdmlldyBtb2RlLCB3ZSB0cmVhdFxuICAgIC8vIGl0IGFzIGJlaW5nIGluICdleHBvcnQnIGZvcm0uIFRoaXMgbWVhbnMgd2UgaGF2ZSB0byBjcmVhdGUgYW4gZXhwb3J0XG4gICAgLy8gdmlldyB0byBsb2FkIHRoZSBkYXRhLlxuICAgIGlmICghd2lkZ2V0RWRpdG9yVmlldy5pc0VkaXRvclZpZXdSZW5kZXJlZCgpKSB7XG4gICAgICB0aGlzLl92aWV3RmFjdG9yeS5jcmVhdGVUZW1wb3Jhcnkod2lkZ2V0TW9kZWwsICR0YXJnZXRFbCwgJ2V4cG9ydCcpLnNhdmUoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB3aWRnZXRFZGl0b3JWaWV3LnNhdmUoKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHdpZGdldCByZWZlcmVuY2luZyB0aGUgc2FtZSBidWZmZXIgaXRlbSB3ZVxuICAgIC8vIG5lZWQgdG8gZHVwbGljYXRlIGl0LiBPbmx5IG9uZSB3aWRnZXQgY2FuIGV2ZXIgcmVmZXJlbmNlIGEgZ2l2ZW5cbiAgICAvLyBidWZmZXIgaXRlbS4gQWRkaXRpb25hbGx5LCBpZiB0aGUgc291cmNlIGNvbnRleHQgaXMgbm90IHRoZSBzYW1lIGFzIHRoZVxuICAgIC8vIHRhcmdldCBjb250ZXh0IHdlIG5lZWQgdG8gZHVwbGljYXRlLiBBIGNvbnRleHQgbWlzbWF0Y2ggZXNzZW50aWFsbHlcbiAgICAvLyBtZWFucyBzb21ldGhpbmcgd2FzIGNvcGllZCBmcm9tIGFub3RoZXIgZmllbGQgaW5zdGFuY2UgaW50byB0aGlzIGZpZWxkXG4gICAgLy8gaW5zdGFuY2UsIHNvIGFsbCB0aGUgZGF0YSBhYm91dCBpdCBpcyBpbiB0aGUgb3JpZ2luYWwgZmllbGQgaW5zdGFuY2UuXG4gICAgdmFyIG1hdGNoaW5nQ29udGV4dHMgPSBzb3VyY2VDb250ZXh0LmdldCgnaWQnKSA9PT0gdGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyk7XG4gICAgaWYgKHRoaXMuX3dpZGdldFN0b3JlLmNvdW50KHdpZGdldE1vZGVsKSA+IDEgfHwgIW1hdGNoaW5nQ29udGV4dHMpIHtcbiAgICAgIHdpZGdldE1vZGVsLmR1cGxpY2F0ZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHdpZGdldEVkaXRvclZpZXcucmVuZGVyKCk7XG4gICAgfVxuICB9LFxuXG4gIHVuYmluZDogZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLl9hcHBseVRvTW9kZWwoaWQsIGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgICB0aGlzLl93aWRnZXRTdG9yZS5yZW1vdmUod2lkZ2V0TW9kZWwsIHRydWUpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIGFuIGV4aXN0aW5nIHdpZGdldC5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgd2lkZ2V0IGlkIHRvIGxvb2t1cC5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgQSB3aWRnZXQgbW9kZWwgaWYgdGhlIGlkIGV4aXN0ZWQgaW4gdGhlIHN0b3JlLCBvciB1bmRlZmluZWQgb3RoZXJ3aXNlLlxuICAgKi9cbiAgZ2V0OiBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiB0aGlzLl93aWRnZXRTdG9yZS5nZXQoaWQpLm1vZGVsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXF1ZXN0cyBhbiBlZGl0IG9wZXJhdGlvbiBmb3IgYSB3aWRnZXQncyByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0uXG4gICAqXG4gICAqIFRoaXMgdHJpZ2dlcnMgYW4gJ2VkaXQnIGNvbW1hbmQgZm9yIHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0uIEl0J3NcbiAgICogdXAgdG8gdGhlIHN5bmMgcHJvdGNvbCBwbHVnaW4sIGFuZCBhc3NvY2lhdGVkIGxvZ2ljIHRvIGRldGVybWluZSBob3cgdG9cbiAgICogaGFuZGxlIHRoaXMgY29tbWFuZC5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgaWQgb2YgdGhlIG1vZGVsIHRvIGdlbmVyYXRlIGFuIGVkaXQgcmVxdWVzdCBmb3IuXG4gICAqL1xuICBlZGl0OiBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuX2FwcGx5VG9Nb2RlbChpZCwgZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICAgIHdpZGdldE1vZGVsLmVkaXQoKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2F2ZXMgYW55IGlubGluZSBlZGl0cyB0byB0aGUgd2lkZ2V0LlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBkb2VzIG5vdCB0cmlnZ2VyIGEgc2VydmVyIHN5bmMuIEl0IHNpbXBseSB1cGRhdGVzIHRoZSB3aWRnZXRcbiAgICogbW9kZWwgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIGVkaXRvciB2aWV3LlxuICAgKlxuICAgKiBUaGUgZWRpdG9yIGlzIGluIGNoYXJnZSBvZiBtYW5hZ2luZyB0aGUgZ2VuZXJhdGVkIG1hcmt1cCBhbmQgc2VuZGluZyBpdCB0b1xuICAgKiB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgd2lkZ2V0IHRvIHNhdmUgaW5saW5lIGVkaXRzIGZvci5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXRFbFxuICAgKiAgIFRoZSBlbGVtZW50IHRvIHNhdmUgdGhlIG91dHB1dGVkIGRhdGEgZm9ybWF0IHRvLlxuICAgKlxuICAgKiBAcmV0dXJuIHtXaWRnZXRNb2RlbH1cbiAgICogICBUaGUgc2F2ZWQgbW9kZWwuXG4gICAqL1xuICBzYXZlOiBmdW5jdGlvbihpZCwgJHRhcmdldEVsKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FwcGx5VG9Nb2RlbChpZCwgZnVuY3Rpb24od2lkZ2V0TW9kZWwpIHtcbiAgICAgIHRoaXMuX3ZpZXdGYWN0b3J5LmNyZWF0ZVRlbXBvcmFyeSh3aWRnZXRNb2RlbCwgJHRhcmdldEVsLCAnZWRpdG9yJykuc2F2ZSgpO1xuICAgICAgdGhpcy5fdmlld0ZhY3RvcnkuY3JlYXRlVGVtcG9yYXJ5KHdpZGdldE1vZGVsLCAkdGFyZ2V0RWwsICdleHBvcnQnKS5yZW5kZXIoKS5zYXZlKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGEgd2lkZ2V0cyB0cmFja2luZyBkYXRhIGFuZCBpbml0aWF0ZXMgd2lkZ2V0IGRlc3RydWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVkfSBpZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgd2lkZ2V0IHRvIGJlIGRlc3Ryb3llZC5cbiAgICogQHBhcmFtIHtib29sfSB3aWRnZXREZXN0cm95ZWRcbiAgICogICBTZXQgdG8gdHJ1ZSBpZiB0aGUgd2lkZ2V0IGhhcyBhbHJlYWR5IGJlZW4gZGVzdHJveWVkIGluIHRoZSBlZGl0b3IuXG4gICAqICAgU2V0dGluZyB0aGlzIHRvIGZhbHNlIHdpbGwgcmVzdWx0IGluIHRoZSBkZXN0cnVjdGlvbiBvZiB0aGUgd2lkZ2V0IHdpdGhpblxuICAgKiAgIHRoZSBlZGl0b3IuXG4gICAqL1xuICBkZXN0cm95OiBmdW5jdGlvbihpZCwgd2lkZ2V0RGVzdHJveWVkKSB7XG4gICAgdGhpcy5fYXBwbHlUb01vZGVsKGlkLCBmdW5jdGlvbih3aWRnZXRNb2RlbCkge1xuICAgICAgaWYgKHdpZGdldERlc3Ryb3llZCkge1xuICAgICAgICB3aWRnZXRNb2RlbC5zZXRTdGF0ZShXaWRnZXRNb2RlbC5TdGF0ZS5ERVNUUk9ZRURfV0lER0VUKTtcbiAgICAgIH1cbiAgICAgIHdpZGdldE1vZGVsLmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQ2xlYW5zIHVwIGFmdGVyIHRoZSB3aWRnZXQgbWFuYWdlciBvYmplY3QuXG4gICAqL1xuICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZWRpdG9yTW9kZWwuZGVzdHJveSgpO1xuICAgIHRoaXMuX3dpZGdldFN0b3JlLmNsZWFudXAoKTtcbiAgICB0aGlzLl9lZGl0QnVmZmVyTWVkaWF0b3IuY2xlYW51cCgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBIGNvbnZlbmllbmNlIGZ1bmN0aW9uIGZvciBsb29raW5nIHVwIGEgd2lkZ2V0IGFuZCBhcHBseWluZyBhbiBhY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGlkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdG8gYWN0IG9uLlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiAgIFRoZSBhY3Rpb24gdG8gYXBwbHkgdGhlIG1vZGVsLCBpZiBmb3VuZC5cbiAgICpcbiAgICogQHJldHVybiB7V2lkZ2V0TW9kZWx9XG4gICAqICAgVGhlIG1vZGVsIGFjdGVkIG9uLCBpZiBhbiBhY3Rpb24gd2FzIGFwcGxpZWQuXG4gICAqL1xuICBfYXBwbHlUb01vZGVsOiBmdW5jdGlvbihpZCwgY2FsbGJhY2spIHtcbiAgICB2YXIgd2lkZ2V0TW9kZWwgPSB0aGlzLmdldChpZCk7XG4gICAgaWYgKHdpZGdldE1vZGVsKSB7XG4gICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBbd2lkZ2V0TW9kZWxdKTtcbiAgICAgIHJldHVybiB3aWRnZXRNb2RlbDtcbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSBjb2xsZWN0aW9uIG9mIHNjaGVtYSBtb2RlbHMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICBFZGl0QnVmZmVySXRlbUNvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0VkaXRCdWZmZXJJdGVtQ29sbGVjdGlvbicpLFxuICBDb250ZXh0TW9kZWwgPSByZXF1aXJlKCcuLi9Nb2RlbHMvQ29udGV4dE1vZGVsJyk7XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblxuICBtb2RlbDogQ29udGV4dE1vZGVsLFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0OiBmdW5jdGlvbihjb250ZXh0U3RyaW5nLCBzZXR0aW5ncywgc2tpcExhenlMb2FkKSB7XG4gICAgaWYgKHR5cGVvZiBjb250ZXh0U3RyaW5nID09ICdzdHJpbmcnICYmICFza2lwTGF6eUxvYWQpIHtcbiAgICAgIGlmICghQmFja2JvbmUuQ29sbGVjdGlvbi5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywgY29udGV4dFN0cmluZykpIHtcbiAgICAgICAgaWYgKCFzZXR0aW5ncykge1xuICAgICAgICAgIHNldHRpbmdzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVkaXRCdWZmZXIgPSBuZXcgRWRpdEJ1ZmZlckl0ZW1Db2xsZWN0aW9uKFtdLCB7IGNvbnRleHRJZDogY29udGV4dFN0cmluZyB9KTtcbiAgICAgICAgdmFyIG1vZGVsID0gbmV3IENvbnRleHRNb2RlbCh7IGlkOiBjb250ZXh0U3RyaW5nIH0sIHsgZWRpdEJ1ZmZlcjogZWRpdEJ1ZmZlciwgc2V0dGluZ3M6IHNldHRpbmdzIH0pO1xuICAgICAgICB0aGlzLmFkZChtb2RlbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBCYWNrYm9uZS5Db2xsZWN0aW9uLnByb3RvdHlwZS5nZXQuY2FsbCh0aGlzLCBjb250ZXh0U3RyaW5nKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHRvdWNoOiBmdW5jdGlvbihjb250ZXh0U3RyaW5nKSB7XG4gICAgdGhpcy5nZXQoY29udGV4dFN0cmluZyk7XG4gIH0sXG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgdGhlIGxvZ2ljIGZvciBleGVjdXRpbmcgY29tbWFuZHMgZnJvbSB0aGUgcXVldWUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICBFZGl0QnVmZmVySXRlbU1vZGVsID0gcmVxdWlyZSgnLi4vTW9kZWxzL0VkaXRCdWZmZXJJdGVtTW9kZWwnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXG4gIG1vZGVsOiBFZGl0QnVmZmVySXRlbU1vZGVsLFxuXG4gIC8qKlxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24obW9kZWxzLCBvcHRpb25zKSB7XG4gICAgdGhpcy5fY29udGV4dElkID0gb3B0aW9ucy5jb250ZXh0SWQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRJdGVtOiBmdW5jdGlvbihjb21tYW5kRW1pdHRlciwgdXVpZCkge1xuICAgIHZhciBpdGVtTW9kZWwgPSB0aGlzLmdldCh1dWlkKTtcbiAgICBpZiAoIWl0ZW1Nb2RlbCkge1xuICAgICAgaXRlbU1vZGVsID0gdGhpcy5hZGQoe2lkOiB1dWlkfSwge21lcmdlOiB0cnVlfSk7XG4gICAgICBjb21tYW5kRW1pdHRlci5yZW5kZXIodGhpcy5nZXRDb250ZXh0SWQoKSwgdXVpZCk7XG4gICAgfVxuICAgIHJldHVybiBpdGVtTW9kZWw7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBzZXRJdGVtOiBmdW5jdGlvbihpdGVtTW9kZWwpIHtcbiAgICByZXR1cm4gdGhpcy5hZGQoaXRlbU1vZGVsLCB7bWVyZ2U6IHRydWV9KTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHJlbW92ZUl0ZW06IGZ1bmN0aW9uKHV1aWQpIHtcbiAgICB0aGlzLnJlbW92ZSh1dWlkKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldENvbnRleHRJZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbnRleHRJZDtcbiAgfVxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgRWRpdG9yTW9kZWwgPSByZXF1aXJlKCcuLi9Nb2RlbHMvRWRpdG9yTW9kZWwnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICBtb2RlbDogRWRpdG9yTW9kZWwsXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgY29sbGVjdGlvbiBvZiBzY2hlbWEgZW50cnkgbW9kZWxzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpLFxuICBTY2hlbWFNb2RlbCA9IHJlcXVpcmUoJy4uL01vZGVscy9TY2hlbWFNb2RlbCcpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cbiAgbW9kZWw6IFNjaGVtYU1vZGVsLFxuXG4gIC8qKlxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24obW9kZWxzLCBvcHRpb25zKSB7XG4gICAgdGhpcy5saXN0ZW5UbyhvcHRpb25zLmNvbnRleHRDb2xsZWN0aW9uLCAnYWRkJywgdGhpcy5hZGRDb250ZXh0U2NoZW1hKTtcbiAgICB0aGlzLl9kaXNwYXRjaGVyID0gb3B0aW9ucy5kaXNwYXRjaGVyO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgaXNBbGxvd2VkOiBmdW5jdGlvbihpZCwgYnVuZGxlTmFtZSkge1xuICAgIHZhciBtb2RlbCA9IHRoaXMuZ2V0KGlkKTtcbiAgICByZXR1cm4gISEobW9kZWwgJiYgbW9kZWwuZ2V0KCdhbGxvd2VkJylbYnVuZGxlTmFtZV0pO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgYWRkQ29udGV4dFNjaGVtYTogZnVuY3Rpb24oY29udGV4dE1vZGVsKSB7XG4gICAgdmFyIGlkID0gY29udGV4dE1vZGVsLmdldCgnZmllbGQnKTtcbiAgICBpZiAoaWQpIHtcbiAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goJ0ZFVENIX1NDSEVNQScsIHt9LCBpZCk7XG4gICAgfVxuICB9XG5cbn0pO1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIFdpZGdldE1vZGVsID0gcmVxdWlyZSgnLi4vTW9kZWxzL1dpZGdldE1vZGVsJyk7XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgbW9kZWw6IFdpZGdldE1vZGVsLFxufSk7XG5cbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGEgbWVjaGFuaXNtIGZvciBjb250cm9sbGluZyBzdWJzY3JpcHRpb25zIHRvIG11bHRpcGxlIGNvbnRleHRzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuLyoqXG4gKiBMaXN0ZW5zIHRvIGEgZ3JvdXAgb2YgY29udGV4dCdzIGVkaXQgYnVmZmVycy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwgQmFja2JvbmUuRXZlbnRzLCB7XG5cbiAgLyoqXG4gICAqIEFkZCBhIGNvbnRleHQgdG8gdGhlIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbnRleHR9IGNvbnRleHRcbiAgICogICBUaGUgY29udGV4dCB0byBsaXN0ZW4gdG8uXG4gICAqL1xuICBhZGRDb250ZXh0OiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgdGhpcy5saXN0ZW5Ubyhjb250ZXh0LmVkaXRCdWZmZXIsICdhZGQnLCB0aGlzLl90cmlnZ2VyRXZlbnRzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogRW1pdHMgYW4gJ2luc2VydEl0ZW0nIG9yICd1cGRhdGVJdGVtJyBldmVudCBmb3IgYSBtb2RlbC5cbiAgICpcbiAgICogQHBhcmFtIHtFZGl0QnVmZmVySXRlbU1vZGVsfSBidWZmZXJJdGVtTW9kZWxcbiAgICogICBUaGUgbW9kZWwgdGhhdCB0aGUgZXZlbnQgaXMgYmVpbmcgdHJpZ2dlcmVkIGZvci5cbiAgICovXG4gIF90cmlnZ2VyRXZlbnRzOiBmdW5jdGlvbihidWZmZXJJdGVtTW9kZWwpIHtcbiAgICBpZiAoYnVmZmVySXRlbU1vZGVsLmdldCgnaW5zZXJ0JykpIHtcbiAgICAgIHRoaXMudHJpZ2dlcignaW5zZXJ0SXRlbScsIGJ1ZmZlckl0ZW1Nb2RlbCk7XG4gICAgICBidWZmZXJJdGVtTW9kZWwuc2V0KHtpbnNlcnQ6IGZhbHNlfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy50cmlnZ2VyKCd1cGRhdGVJdGVtJywgYnVmZmVySXRlbU1vZGVsKTtcbiAgICB9XG4gIH0sXG5cbiAgY2xlYW51cDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgdGhlIGxvZ2ljIGZvciBleGVjdXRpbmcgY29tbWFuZHMgZnJvbSB0aGUgcXVldWUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGV4dENvbGxlY3Rpb24sIHNvdXJjZUNvbnRleHRBdHRyaWJ1dGUsIHRhcmdldENvbnRleHRBdHRyaWJ1dGUsIGVkaXRvckNvbnRleHQpIHtcbiAgdGhpcy5fY29udGV4dENvbGxlY3Rpb24gPSBjb250ZXh0Q29sbGVjdGlvbjtcbiAgdGhpcy5fc291cmNlQ29udGV4dEF0dHJpYnV0ZSA9IHNvdXJjZUNvbnRleHRBdHRyaWJ1dGU7XG4gIHRoaXMuX3RhcmdldENvbnRleHRBdHRyaWJ1dGUgPSB0YXJnZXRDb250ZXh0QXR0cmlidXRlO1xuICB0aGlzLl9lZGl0b3JDb250ZXh0ID0gZWRpdG9yQ29udGV4dDtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKi9cbiAgcmVzb2x2ZVRhcmdldENvbnRleHQ6IGZ1bmN0aW9uICgkZWwpIHtcbiAgICB2YXIgY29udGV4dFN0cmluZyA9ICRlbC5hdHRyKHRoaXMuX3RhcmdldENvbnRleHRBdHRyaWJ1dGUpO1xuICAgIGlmICghY29udGV4dFN0cmluZykge1xuICAgICAgY29udGV4dFN0cmluZyA9ICRlbC5jbG9zZXN0KCdbJyArIHRoaXMuX3RhcmdldENvbnRleHRBdHRyaWJ1dGUgKyAnXScpLmF0dHIodGhpcy5fdGFyZ2V0Q29udGV4dEF0dHJpYnV0ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0KGNvbnRleHRTdHJpbmcpO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgcmVzb2x2ZVNvdXJjZUNvbnRleHQ6IGZ1bmN0aW9uKCRlbCkge1xuICAgIHZhciBjb250ZXh0U3RyaW5nID0gJGVsLmF0dHIodGhpcy5fc291cmNlQ29udGV4dEF0dHJpYnV0ZSk7XG4gICAgcmV0dXJuIGNvbnRleHRTdHJpbmcgPyB0aGlzLmdldChjb250ZXh0U3RyaW5nKSA6IHRoaXMuX2VkaXRvckNvbnRleHQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRFZGl0b3JDb250ZXh0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fZWRpdG9yQ29udGV4dDtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldDogZnVuY3Rpb24oY29udGV4dFN0cmluZykge1xuICAgIGlmIChjb250ZXh0U3RyaW5nKSB7XG4gICAgICB2YXIgc2V0dGluZ3MgPSB0aGlzLl9lZGl0b3JDb250ZXh0ID8gdGhpcy5fZWRpdG9yQ29udGV4dC5nZXRTZXR0aW5ncygpIDoge307XG4gICAgICByZXR1cm4gdGhpcy5fY29udGV4dENvbGxlY3Rpb24uZ2V0KGNvbnRleHRTdHJpbmcsIHNldHRpbmdzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fZWRpdG9yQ29udGV4dDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICB0b3VjaDogZnVuY3Rpb24oY29udGV4dFN0cmluZykge1xuICAgIHJldHVybiB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbi50b3VjaChjb250ZXh0U3RyaW5nKTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhbiBhY3Rpb25hYmxlIHJlZmVyZW5jZSB0byBhIGVkaXQgYnVmZmVyIGl0ZW0uXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihidWZmZXJJdGVtTW9kZWwsIHNvdXJjZUNvbnRleHQsIHRhcmdldENvbnRleHQsIGNvbW1hbmRFbWl0dGVyKSB7XG4gIHRoaXMuZWRpdEJ1ZmZlckl0ZW0gPSBidWZmZXJJdGVtTW9kZWw7IFxuICB0aGlzLnNvdXJjZUNvbnRleHQgPSBzb3VyY2VDb250ZXh0OyBcbiAgdGhpcy50YXJnZXRDb250ZXh0ID0gdGFyZ2V0Q29udGV4dDsgXG4gIHRoaXMuX2NvbW1hbmRFbWl0dGVyID0gY29tbWFuZEVtaXR0ZXI7IFxufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgZWRpdDogZnVuY3Rpb24oZWRpdHMpIHtcbiAgICB0aGlzLl9jb21tYW5kRW1pdHRlci5lZGl0KHRoaXMudGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyksIHRoaXMuZWRpdEJ1ZmZlckl0ZW0uZ2V0KCdpZCcpLCBlZGl0cyk7XG4gIH0sXG5cbiAgcmVuZGVyOiBmdW5jdGlvbihlZGl0cykge1xuICAgIHRoaXMuX2NvbW1hbmRFbWl0dGVyLnJlbmRlcih0aGlzLnRhcmdldENvbnRleHQuZ2V0KCdpZCcpLCB0aGlzLmVkaXRCdWZmZXJJdGVtLmdldCgnaWQnKSwgZWRpdHMpO1xuICB9LFxuXG4gIGR1cGxpY2F0ZTogZnVuY3Rpb24od2lkZ2V0SWQsIGVkaXRzKSB7XG4gICAgdGhpcy5fY29tbWFuZEVtaXR0ZXIuZHVwbGljYXRlKHRoaXMudGFyZ2V0Q29udGV4dC5nZXQoJ2lkJyksIHRoaXMuc291cmNlQ29udGV4dC5nZXQoJ2lkJyksIHRoaXMuZWRpdEJ1ZmZlckl0ZW0uZ2V0KCdpZCcpLCB3aWRnZXRJZCwgZWRpdHMpO1xuICB9XG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYSBmYWN0b3J5IGZvciBjcmVhdGluZyBlZGl0IGJ1ZmZlciBpdGVtIHJlZmVyZW5jZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgRWRpdEJ1ZmZlckl0ZW1SZWYgPSByZXF1aXJlKCcuL0VkaXRCdWZmZXJJdGVtUmVmJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGV4dFJlc29sdmVyLCBjb21tYW5kRW1pdHRlcikge1xuICB0aGlzLl9jb250ZXh0UmVzb2x2ZXIgPSBjb250ZXh0UmVzb2x2ZXI7XG4gIHRoaXMuX2NvbW1hbmRFbWl0dGVyID0gY29tbWFuZEVtaXR0ZXI7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICBjcmVhdGU6IGZ1bmN0aW9uKGJ1ZmZlckl0ZW1Nb2RlbCwgc291cmNlQ29udGV4dCwgdGFyZ2V0Q29udGV4dCkge1xuICAgIHZhciBmYWxsYmFja0NvbnRleHQgPSB0aGlzLl9jb250ZXh0UmVzb2x2ZXIuZ2V0KGJ1ZmZlckl0ZW1Nb2RlbC5jb2xsZWN0aW9uLmdldENvbnRleHRJZCgpKTtcblxuICAgIGlmICghc291cmNlQ29udGV4dCkge1xuICAgICAgc291cmNlQ29udGV4dCA9IGZhbGxiYWNrQ29udGV4dDtcbiAgICB9XG5cbiAgICBpZiAoIXRhcmdldENvbnRleHQpIHtcbiAgICAgIHRhcmdldENvbnRleHQgPSBmYWxsYmFja0NvbnRleHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBFZGl0QnVmZmVySXRlbVJlZihidWZmZXJJdGVtTW9kZWwsIHNvdXJjZUNvbnRleHQsIHRhcmdldENvbnRleHQsIHRoaXMuX2NvbW1hbmRFbWl0dGVyKTtcbiAgfSxcblxuICBjcmVhdGVGcm9tSWRzOiBmdW5jdGlvbihpdGVtSWQsIHNvdXJjZUNvbnRleHRJZCwgdGFyZ2V0Q29udGV4dElkKSB7XG4gICAgaWYgKCFzb3VyY2VDb250ZXh0SWQgfHwgIXRhcmdldENvbnRleHRJZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb3VyY2UgYW5kIHRhcmdldCBjb250ZXh0IGlkcyBhcmUgZXhwbGljaXRseSByZXF1aXJlZCcpO1xuICAgIH1cbiAgICB2YXIgc291cmNlQ29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5nZXQoc291cmNlQ29udGV4dElkKTtcbiAgICB2YXIgdGFyZ2V0Q29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5nZXQodGFyZ2V0Q29udGV4dElkKTtcbiAgICB2YXIgYnVmZmVySXRlbU1vZGVsID0gc291cmNlQ29udGV4dC5lZGl0QnVmZmVyLmdldEl0ZW0odGhpcy5fY29tbWFuZEVtaXR0ZXIsIGl0ZW1JZCk7XG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlKGJ1ZmZlckl0ZW1Nb2RlbCwgc291cmNlQ29udGV4dCwgdGFyZ2V0Q29udGV4dCk7XG4gIH0sXG5cbiAgcmVxdWVzdE5ld0l0ZW06IGZ1bmN0aW9uKHRhcmdldENvbnRleHQsIHR5cGUpe1xuICAgIHRoaXMuX2NvbW1hbmRFbWl0dGVyLmluc2VydCh0YXJnZXRDb250ZXh0LCB0eXBlKTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhIG1lZGlhdG9yIGZvciBuZWdvdGlhdGluZyB0aGUgaW5zZXJ0aW9uIG9mIG5ldyBpdGVtcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LCBlbGVtZW50RmFjdG9yeSwgY29udGV4dExpc3RlbmVyLCBhZGFwdGVyLCBjb250ZXh0UmVzb2x2ZXIpIHtcbiAgdGhpcy5fZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5ID0gZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5O1xuICB0aGlzLl9lbGVtZW50RmFjdG9yeSA9IGVsZW1lbnRGYWN0b3J5O1xuICB0aGlzLl9jb250ZXh0TGlzdGVuZXIgPSBjb250ZXh0TGlzdGVuZXI7XG4gIHRoaXMuX2FkYXB0ZXIgPSBhZGFwdGVyO1xuICB0aGlzLl9jb250ZXh0UmVzb2x2ZXIgPSBjb250ZXh0UmVzb2x2ZXI7XG4gIHRoaXMubGlzdGVuVG8odGhpcy5fY29udGV4dExpc3RlbmVyLCAnaW5zZXJ0SXRlbScsIHRoaXMuX2luc2VydEJ1ZmZlckl0ZW0pO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCBCYWNrYm9uZS5FdmVudHMsIHtcblxuICAvKipcbiAgICogVHJpZ2dlcnMgdGhlIHdpZGdldCBpbnNlcnRpb24gZmxvdy5cbiAgICovXG4gIHJlcXVlc3RCdWZmZXJJdGVtOiBmdW5jdGlvbihidW5kbGVOYW1lLCAkZWwpIHtcbiAgICB2YXIgdGFyZ2V0Q29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5yZXNvbHZlVGFyZ2V0Q29udGV4dCgkZWwpO1xuICAgIHRoaXMuX2NvbnRleHRMaXN0ZW5lci5hZGRDb250ZXh0KHRhcmdldENvbnRleHQpO1xuICAgIHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeS5yZXF1ZXN0TmV3SXRlbSh0YXJnZXRDb250ZXh0LmdldCgnaWQnKSwgYnVuZGxlTmFtZSk7XG4gICAgICBcbiAgfSxcblxuICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jb250ZXh0TGlzdGVuZXIuY2xlYW51cCgpO1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICB9LFxuXG4gIF9pbnNlcnRCdWZmZXJJdGVtOiBmdW5jdGlvbihidWZmZXJJdGVtTW9kZWwpIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeS5jcmVhdGUoYnVmZmVySXRlbU1vZGVsKTtcblxuICAgIC8vIElmIHRoZSBuZXcgbW9kZWwgaXMgcmVhZHkgdG8gYmUgaW5zZXJ0ZWQsIGluc2VydCBhbiBlbWJlZCBjb2RlIGluXG4gICAgLy8gRWRpdG9yIGFuZCBtYXJrIHRoZSBtb2RlbCBhcyBpbnNlcnRlZC5cbiAgICB2YXIgZW1iZWRDb2RlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd3aWRnZXQnLCB7XG4gICAgICB1dWlkOiBidWZmZXJJdGVtTW9kZWwuZ2V0KCdpZCcpLFxuICAgICAgY29udGV4dDogaXRlbS50YXJnZXRDb250ZXh0LmdldCgnaWQnKSxcbiAgICB9KTtcbiAgICBlbWJlZENvZGUuc2V0QXR0cmlidXRlKCc8dmlld21vZGU+JywgJ2VkaXRvcicpO1xuICAgIHRoaXMuX2FkYXB0ZXIuaW5zZXJ0RW1iZWRDb2RlKGVtYmVkQ29kZSk7XG4gIH1cblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBlZGl0b3IgY29tbWFuZHMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgQ29tbWFuZEVtaXR0ZXIgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7U3luY0FjdGlvbkRpc3BhdGNoZXJ9IGRpc3BhdGNoZXJcbiAqICAgVGhlIGFjdGlvbiBkaXNwYXRjaGVyIHRvIHVzZSBmb3IgZGlzcGF0Y2hpbmcgY29tbWFuZHMuXG4gKiBAcGFyYW0ge0VkaXRvckNvbnRleHR9IGVkaXRvckNvbnRleHRcbiAqICAgVGhlIGVkaXRvciBjb250ZXh0IHRvIHVzZSB0byBnZXQgc3luYyBzZXR0aW5ncyBmcm9tLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRpc3BhdGNoZXIsIGVkaXRvckNvbnRleHQpIHtcbiAgdGhpcy5fZGlzcGF0Y2hlciA9IGRpc3BhdGNoZXI7XG4gIHRoaXMuX2VkaXRvckNvbnRleHQgPSBlZGl0b3JDb250ZXh0O1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIGFuIFwiaW5zZXJ0XCIgY29tbWFuZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRhcmdldENvbnRleHRJZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgY29udGV4dCB0aGUgbmV3IGl0ZW0gd2lsbCBiZSBpbnNlcnRlZCBpbnRvLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gYnVuZGxlTmFtZVxuICAgKiAgIFRoZSB0eXBlIG9mIGl0ZW0gdG8gaWUgaW5zZXJ0ZWQuXG4gICAqL1xuICBpbnNlcnQ6IGZ1bmN0aW9uKHRhcmdldENvbnRleHRJZCwgYnVuZGxlTmFtZSkge1xuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgY29tbWFuZDogJ2luc2VydCcsXG4gICAgICB0YXJnZXRDb250ZXh0OiB0YXJnZXRDb250ZXh0SWQsXG4gICAgfTtcblxuICAgIGlmIChidW5kbGVOYW1lKSB7XG4gICAgICBvcHRpb25zLmJ1bmRsZU5hbWUgPSBidW5kbGVOYW1lO1xuICAgIH1cblxuICAgIHRoaXMuX2V4ZWN1dGUoJ0lOU0VSVF9JVEVNJywgb3B0aW9ucyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIGFuIFwiZWRpdFwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIGJ1ZmZlciBpdGVtIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtSWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGJ1ZmZlciBpdGVtIHRvIGJlIGVkaXRlZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgb2YgaW5saW5lIGVkaXRzIHRvIGJlIHByZXNlcnZlZC4gU2VlIFdpZGdldE1vZGVsIGZvciB0aGUgZm9ybWF0IG9mXG4gICAqICAgaW5saW5lIGVkaXRzLlxuICAgKi9cbiAgZWRpdDogZnVuY3Rpb24odGFyZ2V0Q29udGV4dElkLCBpdGVtSWQsIGVkaXRzKSB7XG4gICAgdGhpcy5fZXhlY3V0ZSgnRURJVF9JVEVNJywge1xuICAgICAgY29tbWFuZDogJ2VkaXQnLFxuICAgICAgdGFyZ2V0Q29udGV4dDogdGFyZ2V0Q29udGV4dElkLFxuICAgICAgaXRlbUlkOiBpdGVtSWQsXG4gICAgICBlZGl0czogZWRpdHNcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRXhlY3V0ZXMgYSBcInJlbmRlclwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIGJ1ZmZlciBpdGVtIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtSWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGJ1ZmZlciBpdGVtIHRvIGJlIHJlbmRlcmVkLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZWRpdHNcbiAgICogICBBIG1hcCBvZiBpbmxpbmUgZWRpdHMgdG8gYmUgcHJlc2VydmVkLiBTZWUgV2lkZ2V0TW9kZWwgZm9yIHRoZSBmb3JtYXQgb2ZcbiAgICogICBpbmxpbmUgZWRpdHMuXG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKHRhcmdldENvbnRleHRJZCwgaXRlbUlkLCBlZGl0cykge1xuICAgIHRoaXMuX2V4ZWN1dGUoJ1JFTkRFUl9JVEVNJywge1xuICAgICAgY29tbWFuZDogJ3JlbmRlcicsXG4gICAgICB0YXJnZXRDb250ZXh0OiB0YXJnZXRDb250ZXh0SWQsXG4gICAgICBpdGVtSWQ6IGl0ZW1JZCxcbiAgICAgIGVkaXRzOiBlZGl0c1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBFeGVjdXRlcyBhbiBcImR1cGxpY2F0ZVwiIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXRDb250ZXh0SWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGNvbnRleHQgdGhlIG5ldyBpdGVtIHdpbGwgYmUgaW5zZXJ0ZWQgaW50by5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUNvbnRleHRJZFxuICAgKiAgIFRoZSBpZCBvZiB0aGUgY29udGV4dCB0aGUgaXRlbSBiZWluZyBkdXBsaWNhdGVkIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtSWRcbiAgICogICBUaGUgaWQgb2YgdGhlIGJ1ZmZlciBpdGVtIHRvIGJlIGR1cGxpY2F0ZWQuXG4gICAqIEBwYXJhbSB7bWl4ZWR9IHdpZGdldElkXG4gICAqICAgVGhlIGlkIG9mIHRoZSB3aWRnZXQgdGhhdCB3aWxsIGJlIHVwZGF0ZWQgdG8gcmVmZXJlbmNlIHRoZSBuZXdseSBjcmVhdGVkXG4gICAqICAgaXRlbS5cbiAgICogQHBhcmFtIHtvYmplY3R9IGVkaXRzXG4gICAqICAgQSBtYXAgb2YgaW5saW5lIGVkaXRzIHRvIGJlIHByZXNlcnZlZC4gU2VlIFdpZGdldE1vZGVsIGZvciB0aGUgZm9ybWF0IG9mXG4gICAqICAgaW5saW5lIGVkaXRzLlxuICAgKi9cbiAgZHVwbGljYXRlOiBmdW5jdGlvbih0YXJnZXRDb250ZXh0SWQsIHNvdXJjZUNvbnRleHRJZCwgaXRlbUlkLCB3aWRnZXRJZCwgZWRpdHMpIHtcbiAgICB0aGlzLl9leGVjdXRlKCdEVVBMSUNBVEVfSVRFTScsIHtcbiAgICAgIGNvbW1hbmQ6ICdkdXBsaWNhdGUnLFxuICAgICAgdGFyZ2V0Q29udGV4dDogdGFyZ2V0Q29udGV4dElkLFxuICAgICAgc291cmNlQ29udGV4dDogc291cmNlQ29udGV4dElkLFxuICAgICAgaXRlbUlkOiBpdGVtSWQsXG4gICAgICB3aWRnZXQ6IHdpZGdldElkLFxuICAgICAgZWRpdHM6IGVkaXRzXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsIGNhbGxiYWNrIGZvciB0cmlnZ2VyaW5nIHRoZSBjb21tYW5kIHRvIGJlIHNlbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgVGhlIHR5cGUgb2YgY29tbWFuZCBiZWluZyBwZXJmb3JtZWQuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb21tYW5kXG4gICAqICAgVGhlIGNvbW1hbmQgZGF0YSB0byBiZSBwYXNzZWQgdG8gdGhlIGRpc3BhdGNoZWQuXG4gICAqL1xuICBfZXhlY3V0ZTogZnVuY3Rpb24odHlwZSwgY29tbWFuZCkge1xuICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2godHlwZSwgY29tbWFuZCwgdGhpcy5fZWRpdG9yQ29udGV4dC5nZXRTZXR0aW5ncygpKTtcbiAgfVxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGNyZWF0aW5nIHdpZGdldCBtb2RlbHMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgV2lkZ2V0TW9kZWwgPSByZXF1aXJlKCcuLi8uLi9Nb2RlbHMvV2lkZ2V0TW9kZWwnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgd2lkZ2V0IGZhY3RvcnkuXG4gKlxuICogQHBhcmFtIHtDb250ZXh0UmVzb2x2ZXJ9IGNvbnRleHRSZXNvbHZlclxuICogICBBIGNvbnRleHQgcmVzb2x2ZXIgdG8gdXNlIGZvciByZXNvbHZpbmcgdGhlIHNvdXJjZSBhbmQgdGFyZ2V0IGNvbnRleHRzIGZvclxuICogICBhIHdpZGdldC5cbiAqIEBwYXJhbSB7RWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5fSBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnlcbiAqICAgVGhlIGVkaXQgYnVmZmVyIGl0ZW0gcmVmZXJlbmNlIGZhY3RvcnkgdG8gcGFzcyB0aHJvdWdoIHRvIGNyZWF0ZWQgd2lkZ2V0cy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB1dWlkQXR0cmlidXRlTmFtZVxuICogICBUaGUgbmFtZSBvZiB0aGUgdXVpZCBhdHRyaWJ1dGUgb24gdGhlIHdpZGdldCBlbGVtZW50IHRvIHB1bGwgZWRpdCBidWZmZXJcbiAqICAgaXRlbSBpZHMgZnJvbSB0aGUgRE9NLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRleHRSZXNvbHZlciwgZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LCB1dWlkQXR0cmlidXRlTmFtZSkge1xuICB0aGlzLl9jb250ZXh0UmVzb2x2ZXIgPSBjb250ZXh0UmVzb2x2ZXI7XG4gIHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeSA9IGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeTtcbiAgdGhpcy5fdXVpZEF0dHJpYnV0ZU5hbWUgPSB1dWlkQXR0cmlidXRlTmFtZTtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IHdpZGdldCBtb2RlbCBiYXNlZCBvbiBkYXRhIHByb3ZpZGVkIGJ5IHRoZSBlZGl0b3IuXG4gICAqXG4gICAqIEBwYXJhbSB7bWl4ZWR9IHdpZGdldFxuICAgKiAgIFRoaXMgaXMgYW55IGFyYml0cmFyeSBkYXRhIHRoZSBlZGl0b3IgaW1wbGVtZW50YXRpb24gd2FudHMgdG8gYXNzb2NpYXRlXG4gICAqICAgd2l0aCB0aGUgd2lkZ2V0IG1vZGVsLiBUaGlzIGxldHMgeW91IGFjY2VzcyBlZGl0b3Itc3BlY2lmaWMgd2lkZ2V0IGRhdGFcbiAgICogICBzdHJ1Y3R1cmVzIGZyb20gd2l0aGluIHRoZSBlZGl0b3IgYWRhcHRlci5cbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBBIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgd2lkZ2V0LiBJbiBtb3N0IGNhc2VzLCBpdCBtYWtlcyBzZW5zZSB0byBwYXNzXG4gICAqICAgdGhpcyB0aHJvdWdoIGRpcmVjdGx5IGZyb20gdGhlIGZhY2lsaXR5IHRoYXQgdGhlIGVkaXRvciB1c2VkIHRvIGNyZWF0ZVxuICAgKiAgIHRoZSB3aWRnZXQuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxcbiAgICogICBUaGUgd2lkZ2V0IGVsZW1lbnQuIFRoaXMgd2lsbCBiZSB1c2VkIHRvIGRlcml2ZSB0aGUgY29udGV4dCBiZWluZ1xuICAgKiAgIGluc2VydGVkIGludG8gKHRhcmdldENvbnRleHQpLCB0aGUgY29udGV4dCB0aGUgcmVmZXJlbmNlZCBlZGl0IGJ1ZmZlclxuICAgKiAgIGl0ZW0gY2FtZSBmcm9tIChzb3VyY2VDb250ZXh0KSwgYW5kIHRoZSByZWZlcmVuY2VkIGl0ZW0gaWQuXG4gICAqXG4gICAqIEByZXR1cm4ge1dpZGdldE1vZGVsfVxuICAgKiAgIFRoZSBuZXdseSBjcmVhdGVkIHdpZGdldCBtb2RlbC5cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24od2lkZ2V0LCBpZCwgJGVsKSB7XG4gICAgdmFyIHNvdXJjZUNvbnRleHQgPSB0aGlzLl9jb250ZXh0UmVzb2x2ZXIucmVzb2x2ZVNvdXJjZUNvbnRleHQoJGVsKTtcbiAgICB2YXIgdGFyZ2V0Q29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5yZXNvbHZlVGFyZ2V0Q29udGV4dCgkZWwpO1xuXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBlZGl0QnVmZmVySXRlbVJlZkZhY3Rvcnk6IHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeSxcbiAgICAgIGNvbnRleHRSZXNvbHZlcjogdGhpcy5fY29udGV4dFJlc29sdmVyLFxuICAgICAgd2lkZ2V0OiB3aWRnZXQsXG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgV2lkZ2V0TW9kZWwoe1xuICAgICAgaWQ6IGlkLFxuICAgICAgY29udGV4dElkOiB0YXJnZXRDb250ZXh0LmdldCgnaWQnKSxcbiAgICAgIGl0ZW1JZDogJGVsLmF0dHIodGhpcy5fdXVpZEF0dHJpYnV0ZU5hbWUpLFxuICAgICAgaXRlbUNvbnRleHRJZDogc291cmNlQ29udGV4dC5nZXQoJ2lkJyksXG4gICAgfSwgb3B0aW9ucyk7XG4gIH0sXG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogUHJvdmlkZXMgYSBjbGFzcyBmb3Igc3RvcmluZyB3aWRnZXQgdHJhY2tpbmcgZGF0YS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gIFdpZGdldE1vZGVsID0gcmVxdWlyZSgnLi4vLi4vTW9kZWxzL1dpZGdldE1vZGVsJyksXG4gIFdpZGdldENvbGxlY3Rpb24gPSByZXF1aXJlKCcuLi8uLi9Db2xsZWN0aW9ucy9XaWRnZXRDb2xsZWN0aW9uJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIFdpZGdldFN0b3JlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge0VkaXRvckFkYXB0ZXJ9IGFkYXB0ZXJcbiAqICAgVGhlIGVkaXRvciBhZGFwdGVyIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHRpZSB0aGUgZWRpdG9yIHdpZGdldCBzdGF0ZSB0byB0aGVcbiAqICAgaW50ZXJuYWwgdHJhY2tlZCB3aWRnZXQgc3RhdGUuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYWRhcHRlcikge1xuICB0aGlzLl9hZGFwdGVyID0gYWRhcHRlcjtcbiAgdGhpcy5fdmlld3MgPSB7fTtcbiAgdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbiA9IG5ldyBXaWRnZXRDb2xsZWN0aW9uKCk7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuXG4gIC8qKlxuICAgKiBBZGRzIGEgbW9kZWwgdG8gdGhlIHdpZGdldCBzdG9yZS5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHdpZGdldE1vZGVsXG4gICAqICAgVGhlIHdpZGdldCBtb2RlbCB0byBiZSB0cmFja2VkLCBvciBhbiBhdHRyaWJ1dGVzIG9iamVjdCB0byB1cGRhdGUgYW5cbiAgICogICBleGlzdGluZyBtb2RlbCB3aXRoLiBJZiBhbiBhdHRyaWJ1dGVzIG9iamVjdCBpcyBwcm92aWRlZCwgaXQgbXVzdCBoYXZlIGFuXG4gICAqICAgaWQgYXR0cmlidXRlIGFuZCB0aGUgbW9kZSBtdXN0IGFscmVhZHkgYmUgaW4gdGhlIHN0b3JlLiBPdGhlcndpc2UgYW5cbiAgICogICBlcnJvciB3aWxsIGJlIHRocm93bi4gSWYgYSBtb2RlbCBpcyBwcm92aWRlZCBhbmQgYmVsb25ncyB0byBhIGNvbGxlY3Rpb24sXG4gICAqICAgaXQgbXVzdCBiZWxvbmcgdG8gdGhlIHdpZGdldCBzdG9yZSBpbnN0YW5jZSBjb2xsZWN0aW9uLiBPdGhlcndpc2UgYW5cbiAgICogICBlcnJvciB3aWxsIGJlIHRocm93bi5cbiAgICogQHBhcmFtIHtCYWNrYm9uZS5WaWV3fSB3aWRnZXRWaWV3XG4gICAqICAgQW4gb3B0aW9uYWwgdmlldyBjb3JyZXNwb25kaW5nIHRvIHRoZSB3aWRnZXQncyBET00gZWxlbWVudCwgaWYgb25lXG4gICAqICAgZXhpc3RzLiBUaGlzIHdpbGwgYmUgdXNlZCB0byB0cmFjayB3aGV0aGVyIHRoZSB3aWRnZXQgaXMgcHJlc2VudCBpbiB0aGVcbiAgICogICBET00gYW5kIGlmIGl0IGdldHMgb3JwaGFuZWQuXG4gICAqL1xuICBhZGQ6IGZ1bmN0aW9uKHdpZGdldE1vZGVsLCB3aWRnZXRWaWV3KSB7XG4gICAgaWYgKCEod2lkZ2V0TW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCkpIHtcbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gd2lkZ2V0TW9kZWw7XG4gICAgICB3aWRnZXRNb2RlbCA9IHRoaXMuX3dpZGdldENvbGxlY3Rpb24uZ2V0KGF0dHJpYnV0ZXMuaWQpO1xuICAgICAgaWYgKCF3aWRnZXRNb2RlbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F0dGVtcHQgdG8gdXBkYXRlIGFuIHVua25vd24gd2lkZ2V0LicpO1xuICAgICAgfVxuICAgICAgd2lkZ2V0TW9kZWwuc2V0KGF0dHJpYnV0ZXMpO1xuICAgIH1cblxuICAgIGlmICh3aWRnZXRNb2RlbC5jb2xsZWN0aW9uKSB7XG4gICAgICBpZiAod2lkZ2V0TW9kZWwuY29sbGVjdGlvbiAhPT0gdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSB3aWRnZXQgYmVpbmcgYWRkZWQgYWxyZWFkeSBiZWxvbmdzIHRvIGFub3RoZXIgZWRpdG9yLicpO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMubGlzdGVuVG8od2lkZ2V0TW9kZWwsICdkZXN0cm95JywgdGhpcy5yZW1vdmUpO1xuICAgICAgdGhpcy5saXN0ZW5Ubyh3aWRnZXRNb2RlbCwgJ2NoYW5nZTppdGVtSWQnLCB0aGlzLl91cGRhdGVJdGVtUmVmZXJlbmNlKTtcbiAgICAgIHRoaXMuX3dpZGdldENvbGxlY3Rpb24uYWRkKHdpZGdldE1vZGVsKTtcbiAgICB9XG5cbiAgICBpZiAod2lkZ2V0Vmlldykge1xuICAgICAgdmFyIGkgPSB3aWRnZXRNb2RlbC5nZXQoJ2l0ZW1JZCcpO1xuICAgICAgdmFyIGogPSB3aWRnZXRNb2RlbC5nZXQoJ2lkJyk7XG4gICAgICBpZiAoIXRoaXMuX3ZpZXdzW2ldKSB7XG4gICAgICAgIHRoaXMuX3ZpZXdzW2ldID0ge307XG4gICAgICB9XG4gICAgICB0aGlzLl92aWV3c1tpXVtqXSA9IHdpZGdldFZpZXc7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIGEgd2lkZ2V0IG1vZGVsLCB2aWV3IHBhaXIgYmFzZWQgb24gaXRzIHdpZGdldCBpZC5cbiAgICpcbiAgICogQHBhcmFtIHttaXhlZH0gaWRcbiAgICogICBUaGUgaWQgb2YgdGhlIHdpZGdldCB0byBnZXQuXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICogICBBbiBvYmplY3Qgd2l0aCBrZXlzICdtb2RlbCcgYW5kICd2aWV3Jywgd2hpY2ggYXJlIHJlc3BlY3RpdmVseSB0aGUgbW9kZWxcbiAgICogICBhbmQgdmlldyBvYmplY3RzIGFzc29jaWF0ZWQgd2l0aCB0aGUgd2lkZ2V0IGlkLiBJZiBlaXRoZXIgY2Fubm90IGJlXG4gICAqICAgZm91bmQsIHRoZSB2YWx1ZSBpbiB0aGUgcmVzcGVjdGl2ZSBrZXkgaXMgbnVsbC5cbiAgICovXG4gIGdldDogZnVuY3Rpb24oaWQpIHtcbiAgICB2YXIgd2lkZ2V0TW9kZWwgPSB0aGlzLl93aWRnZXRDb2xsZWN0aW9uLmdldChpZCk7XG5cbiAgICBpZiAod2lkZ2V0TW9kZWwpIHtcbiAgICAgIHZhciBpID0gd2lkZ2V0TW9kZWwuZ2V0KCdpdGVtSWQnKTtcbiAgICAgIHZhciBqID0gd2lkZ2V0TW9kZWwuZ2V0KCdpZCcpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbW9kZWw6IHdpZGdldE1vZGVsLFxuICAgICAgICB2aWV3OiB0aGlzLl9yZWFkQ2VsbChpLCBqKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1vZGVsOiBudWxsLFxuICAgICAgdmlldzogbnVsbFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBtb2RlbCBmcm9tIHRoZSBzdG9yZS5cbiAgICpcbiAgICogSWYgdGhlIHdpZGdldCBoYXMgbm90IGFscmVhZHkgYmVlbiBtYXJrZWQgYXMgZGVzdHJveWVkIGJ5IHRoZSBlZGl0b3IsIHRoaXNcbiAgICogbWV0aG9kIHdpbGwgYWxzbyB0cmlnZ2VyIHdpZGdldCBkZXN0cnVjdGlvbiB3aXRoaW4gdGhlIGVkaXRvciB0aHJvdWdoIHRoZVxuICAgKiBlZGl0b3IgYWRhcHRlci5cbiAgICpcbiAgICogQHBhcmFtIHtXaWRnZXRNb2RlbH0gd2lkZ2V0TW9kZWxcbiAgICogICBUaGUgd2lkZ2V0IG1vZGVsIHRvIGJlIHJlbW92ZWQgZnJvbSB0aGUgc3RvcmUuXG4gICAqIEBwYXJhbSB7Ym9vbH0gc2tpcERlc3Ryb3lcbiAgICogICBBbGxvd3MgdGhlIGNsaWVudCB0byBzdG9wIHRyYWNraW5nIGEgd2lkZ2V0IHdpdGhvdXQgYWN0dWFsbHkgdHJpZ2dlcmluZ1xuICAgKiAgIHRoZSBkZXN0cnVjdGlvbiBvZiB0aGF0IHdpZGdldCB3aXRoaW4gdGhlIGVkaXRvci4gUGFzcyB0cnVlIHRvIGF2b2lkXG4gICAqICAgZGVzdHJveWluZyB0aGUgZWRpdG9yIHdpZGdldC4gQnkgZGVmYXVsdCwgY2FsbGluZyB0aGlzIG1ldGhvZCB3aWxsXG4gICAqICAgdHJpZ2dlciB3aWRnZXQgZGVzdHJ1Y3Rpb24gd2l0aGluIHRoZSBlZGl0b3IgaWYgaXQgaGFzIG5vdCBhbHJlYWR5IGJlZW5cbiAgICogICBkZXN0cm95ZWQuXG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKHdpZGdldE1vZGVsLCBza2lwRGVzdHJveSkge1xuICAgIHZhciBpID0gd2lkZ2V0TW9kZWwuZ2V0KCdpdGVtSWQnKTtcbiAgICB2YXIgaiA9IHdpZGdldE1vZGVsLmdldCgnaWQnKTtcblxuICAgIC8vIElmIHRoZSB3aWRnZXQgaGFzIG5vdCBhbHJlYWR5IGJlZW4gZGVzdHJveWVkIHdpdGhpbiB0aGUgZWRpdG9yLCB0aGVuXG4gICAgLy8gcmVtb3ZpbmcgaXQgaGVyZSB0cmlnZ2VycyBpdHMgZGVzdHJ1Y3Rpb24uIFdlIHByb3ZpZGUgdGhlIGNhbGxlciB0aGVcbiAgICAvLyBhYmlsaXR5IHRvIHNpZGVzdGVwIHRoaXMgc2lkZSBlZmZlY3Qgd2l0aCB0aGUgc2tpcERlc3Ryb3kgb3B0LW91dC5cbiAgICBpZiAoIXdpZGdldE1vZGVsLmhhc1N0YXRlKFdpZGdldE1vZGVsLlN0YXRlLkRFU1RST1lFRF9XSURHRVQpICYmICFza2lwRGVzdHJveSkge1xuICAgICAgdGhpcy5fYWRhcHRlci5kZXN0cm95V2lkZ2V0KHdpZGdldE1vZGVsLmdldCgnaWQnKSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgaXMgY3VycmVudGx5IGEgdmlldyBhc3NvY2FpdGVkIHdpdGggdGhlIHdpZGdldCwgdGhlbiBkZXN0cm95IGl0LlxuICAgIGlmICh0aGlzLl92aWV3c1tpXSAmJiB0aGlzLl92aWV3c1tpXVtqXSkge1xuICAgICAgdmFyIHZpZXcgPSB0aGlzLl92aWV3c1tpXVtqXTtcbiAgICAgIGRlbGV0ZSB0aGlzLl92aWV3c1tpXVtqXTtcbiAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHRoZSB3aWRnZXQgZnJvbSB0aGUgaW50ZXJuYWwgY29sbGVjdGlvbiwgcGVyZm9ybSBtZW1vcnkgY2xlYW51cCxcbiAgICAvLyBhbmQgbWFyayB0aGUgd2lkZ2V0IG1vZGVsIGFzIG5vIGxvbmdlciBiZWluZyB0cmFja2VkLlxuICAgIHRoaXMuX2NsZWFuUm93KGkpO1xuICAgIHRoaXMuX3dpZGdldENvbGxlY3Rpb24ucmVtb3ZlKHdpZGdldE1vZGVsKTtcbiAgICB3aWRnZXRNb2RlbC5zZXRTdGF0ZShXaWRnZXRNb2RlbC5TdGF0ZS5ERVNUUk9ZRURfUkVGUyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvdW50cyB0aGUgbnVtYmVyIG9mIGRpZmZlcmVudCB3aWRnZXRzIHRoYXQgcmVmZXJlbmNlIHRoZSBzYW1lIGJ1ZmZlciBpdGVtLlxuICAgKlxuICAgKiBAcGFyYW0ge1dpZGdldE1vZGVsfSB3aWRnZXRNb2RlbFxuICAgKiAgIEEgd2lkZ2V0IG1vZGVsIHRvIGNvdW50IHRoZSBidWZmZXIgaXRlbSByZWZlcmVuY2VzIGZvci4gVGhpcyBmdW5jdGlvblxuICAgKiAgIHdpbGwgcmV0dXJuIHRoZSB0b3RhbCBudW1iZXIgb2Ygd2lkZ2V0cyB0aGF0IHJlZmVyZW5jZSB0aGUgYnVmZmVyIGl0ZW1cbiAgICogICBnaXZlbiBieSB0aGUgaXRlbUlkIGF0dHJpYnV0ZSBvbiB0aGUgd2lkZ2V0IG1vZGVsLCBpbmNsdWRpbmcgdGhlIHBhc3NlZFxuICAgKiAgIHdpZGdldCBpdGVzZWxmLlxuICAgKlxuICAgKiBAcmV0dXJuIHtpbnR9XG4gICAqICAgVGhlIG51bWJlciBvZiB3aWRnZXRzIHJlZmVyZW5jaW5nIHRoZSBpdGVtIHNwZWNpZmllZCBieSB0aGUgcGFzc2VkIHdpZGdldFxuICAgKiAgIG1vZGVsJ3MgcmVmZXJlbmNlZCBpdGVtLlxuICAgKi9cbiAgY291bnQ6IGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgdmFyIGNvdW50ID0gMDtcblxuICAgIGlmICh3aWRnZXRNb2RlbCkge1xuICAgICAgdmFyIGkgPSB3aWRnZXRNb2RlbC5nZXQoJ2l0ZW1JZCcpO1xuICAgICAgZm9yICh2YXIgaiBpbiB0aGlzLl92aWV3c1tpXSkge1xuICAgICAgICBpZiAodGhpcy5fcmVhZENlbGwoaSwgaikpIHtcbiAgICAgICAgICBjb3VudCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvdW50O1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgY2xlYW51cDogZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLl92aWV3cykge1xuICAgICAgZm9yICh2YXIgaiBpbiB0aGlzLl92aWV3c1tpXSkge1xuICAgICAgICB0aGlzLl92aWV3c1tpXVtqXS5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLl92aWV3c1tpXTtcbiAgICB9XG4gICAgdGhpcy5fd2lkZ2V0Q29sbGVjdGlvbi5yZXNldCgpO1xuICAgIHRoaXMuX2FkYXB0ZXIuY2xlYW51cCgpO1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTYWZlbHkgcmV0cmlldmVzIGEgdmlldyBmcm9tIHRoZSB0YWJsZSBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogQHBhcmFtIHtpbnR9IGlcbiAgICogICBUaGUgcm93IChidWZmZXIgaXRlbSBpZCkgaW4gdGhlIHZpZXcgdGFibGUgdG8gcmVhZCBmcm9tLlxuICAgKiBAcGFyYW0ge2ludH0galxuICAgKiAgIFRoZSBjb2x1bW4gKHdpZGdldCBpZCkgaW4gdGhlIHZpZXcgdGFibGUgdG8gcmVhZCBmcm9tLlxuICAgKlxuICAgKiBAcmV0dXJuIHtCYWNrYm9uZS5WaWV3fVxuICAgKiAgIEEgdmlldyBvYmplY3QgaWYgb25lIGV4aXN0cyBpbiB0aGUgdmlldyB0YWJsZSBpdCAoaSxqKSwgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBfcmVhZENlbGw6IGZ1bmN0aW9uKGksIGopIHtcbiAgICB2YXIgdmlldyA9IG51bGw7XG5cbiAgICBpZiAodGhpcy5fdmlld3NbaV0gJiYgdGhpcy5fdmlld3NbaV1bal0pIHtcbiAgICAgIHZpZXcgPSB0aGlzLl92aWV3c1tpXVtqXTtcbiAgICAgIGlmICghdGhpcy5fYWRhcHRlci5nZXRSb290RWwoKS5jb250YWlucyh2aWV3LmVsKSkge1xuICAgICAgICB0aGlzLnJlbW92ZSh2aWV3Lm1vZGVsKTtcbiAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZpZXc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlY2xhaW1zIHNwYWNlIGZyb20gYW4gdW51c2VkIHJvdy5cbiAgICpcbiAgICogVGhpcyBpcyBjYWxsZWQgYWZ0ZXIgcGVyZm9ybWluZyBlbnRyeSByZW1vdmFscyB0byBkZWxldGUgcm93cyBpbiB0aGUgdmlld1xuICAgKiB0YWJsZSBvbmNlIHRoZXkgYmVjb21lIGVtcHR5LlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaVxuICAgKiAgIFRoZSByb3cgaW4gdGhlIHZpZXcgdGFibGUgdG8gY2hlY2sgZm9yIGNsZWFudXAuIElmIHRoaXMgcm93IGlzIGVtcHR5LCBpdFxuICAgKiAgIHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIF9jbGVhblJvdzogZnVuY3Rpb24oaSkge1xuICAgIGlmICh0aGlzLl92aWV3c1tpXSAmJiBfLmlzRW1wdHkodGhpcy5fdmlld3NbaV0pKSB7XG4gICAgICBkZWxldGUgdGhpcy5fdmlld3NbaV07XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSB3aWRnZXQgdGFibGUgd2hlbiBhIHdpZGdldCdzIHJlZmVyZW5jZWQgaXRlbSBoYXMgY2hhbmdlZC5cbiAgICpcbiAgICogVGhpcyBlbnN1cmVzIHRoYXQgd2hlbiBhIGJ1ZmZlciBpdGVtIGlzIGR1cGxpY2F0ZWQgZm9yIGEgd2lkZ2V0LCBhbmQgdGhlXG4gICAqIHdpZGdldCBnZXRzIHVwZGF0ZWQgdG8gcG9pbnQgdG8gdGhlIG5ldyBpdGVtLCB0aGUgdmlldyB0YWJsZSBpcyB1cGRhdGVkIHRvXG4gICAqIHJlZmxlY3QgdGhlIGNoYW5nZS4gSW4gcGFydGljdWxhciB0aGlzIG1lYW5zIG1vdmluZyB0aGUgZGF0YSBmcm9tIHRoZSBvbGRcbiAgICogdGFibGUgZW50cnkgdG8gdGhlIG5ldyB0YWJsZSBlbnRyeS5cbiAgICpcbiAgICogQHBhcmFtIHtXaWRnZXRNb2RlbH0gd2lkZ2V0TW9kZWxcbiAgICogICBUaGUgd2lkZ2V0IG1vZGVsIHRoYXQgaGFzIGhhZCBpdHMgaXRlbUlkIGF0dHJpYnV0ZSB1cGRhdGVkLlxuICAgKi9cbiAgX3VwZGF0ZUl0ZW1SZWZlcmVuY2U6IGZ1bmN0aW9uKHdpZGdldE1vZGVsKSB7XG4gICAgdmFyIGkgPSB3aWRnZXRNb2RlbC5wcmV2aW91cygnaXRlbUlkJyk7XG4gICAgdmFyIGogPSB3aWRnZXRNb2RlbC5nZXQoJ2lkJyk7XG4gICAgdmFyIGsgPSB3aWRnZXRNb2RlbC5nZXQoJ2l0ZW1JZCcpO1xuXG4gICAgaWYgKHRoaXMuX3ZpZXdzW2ldICYmIHRoaXMuX3ZpZXdzW2ldW2pdKSB7XG4gICAgICBpZiAoIXRoaXMuX3ZpZXdzW2tdKSB7XG4gICAgICAgIHRoaXMuX3ZpZXdzW2tdID0ge307XG4gICAgICB9XG4gICAgICB0aGlzLl92aWV3c1trXVtqXSA9IHRoaXMuX3ZpZXdzW2ldW2pdO1xuICAgICAgZGVsZXRlIHRoaXMuX3ZpZXdzW2ldW2pdO1xuICAgIH1cblxuICAgIHRoaXMuX2NsZWFuUm93KGkpO1xuICB9LFxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhIGNsYXNzIGZvciBnZW5lcmF0aW5nIHdpZGdldCB2aWV3cy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBXaWRnZXRWaWV3RmFjdG9yeSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50RmFjdG9yeX0gZWxlbWVudEZhY3RvcnlcbiAqICAgVGhlIGVsZW1lbnQgZmFjdG9yeSB0aGF0IHdpbGwgYmUgaW5qZWN0ZWQgaW50byBjcmVhdGVkIHZpZXdzLlxuICogQHBhcmFtIHtFZGl0b3JBZGFwdGVyfSBhZGFwdGVyXG4gKiAgIFRoZSBlZGl0b3IgYWRhcHRlciB0aGF0IHdpbGwgYmUgaW5qZWN0ZWQgaW50byBjcmVhdGVkIHZpZXdzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsZW1lbnRGYWN0b3J5LCBhZGFwdGVyKSB7XG4gIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gZWxlbWVudEZhY3Rvcnk7XG4gIHRoaXMuX2FkYXB0ZXIgPSBhZGFwdGVyO1xuICB0aGlzLl92aWV3TW9kZXMgPSBbXTtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSB2aWV3IG1vZGUuXG4gICAqXG4gICAqIFZpZXcgbW9kZXMgY29ycmVzcG9uZCB0byBzcGVjaWZpYyB2aWV3IHByb3RvdHlwZXMuIFRoaXMgYWxsb3dzIHdpZGdldHMgdG9cbiAgICogYmUgZGlzcGxheWVkIGluIGRpZmZlcmVudCBmb3Jtcy4gRm9yIHRoZSBwdXJwb3NlcyBvZiB0aGUgd2lkZ2V0LXN5bmNcbiAgICogbGlicmFyeSwgdGhpcyBnZW5lcmFsbHkgbWVhbnMgd2UgaGF2ZSBvbmUgJ2VkaXRvcicgdmlldyBtb2RlIHRoYXQgdGhlIHVzZXJcbiAgICogd2lsbCBpbnRlcmFjdCB3aXRoIGluIHRoZSB3eXNpd3lnLCBhbmQgb25lIG9yIG1vcmUgJ2V4cG9ydCcgdmlldyBtb2RlKHMpXG4gICAqIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHRyYW5zZm9ybSB1c2VyIGlucHV0IGludG8gYSBmb3JtYXQgdGhhdCBpcyBlYXNpZXIgdG9cbiAgICogc2F2ZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHZpZXdNb2RlXG4gICAqICAgVGhlIG5hbWUgb2YgdGhlIHZpZXcgbW9kZSBiZWluZyByZWdpc3RlcmVkLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gICAqICAgVGhlIGRlZmluaXRpb24gb2YgdGhlIG9iamVjdCBiZWluZyByZWdpc3RlcmVkLiBTZWUgY29uZmlnLmpzIGZvciBleGFtcGxlc1xuICAgKiAgIG9mIHRoZSBmb3JtYXQgb2YgdGhpcyBvYmplY3QuIEF0IG1pbmltdW0sIGVhY2ggZGVmaW5pdGlvbiBuZWVkcyBhXG4gICAqICAgJ3Byb3RvdHlwZScga2V5IHRoYXQgaXMgYSBCYWNrYm9uZS5WaWV3IGRlc2NlbmRlZCB0eXBlLlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqICAgVGhlIHBhc3NlZCBkZWZpdGlvbiBpZiBubyBlcnJvcnMgb2NjdXJyZWQuXG4gICAqL1xuICByZWdpc3RlcjogZnVuY3Rpb24odmlld01vZGUsIGRlZikge1xuICAgIGlmICghZGVmIHx8ICFkZWYucHJvdG90eXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZXcgbW9kZSByZXF1aXJlcyBhIHZpZXcgcHJvdG90eXBlLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl92aWV3TW9kZXNbdmlld01vZGVdID0gZGVmO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgdmlldyBmb3IgYSB3aWRnZXQgbW9kZWwuXG4gICAqXG4gICAqIEBwYXJhbSB7V2lkZ2V0TW9kZWx9IHdpZGdldE1vZGVsXG4gICAqICAgVGhlIHdpZGdldCBtb2RlbCB0byBjcmVhdGUgdGhlIHZpZXcgZm9yLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsXG4gICAqICAgQSBqUXVlcnkgd3JhcHBlZCBlbGVtZW50IGZvciB0aGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgdGhlIHJvb3Qgb2YgdGhlXG4gICAqICAgdmlldy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHZpZXdNb2RlXG4gICAqICAgVGhlIHZpZXcgbW9kZSB0byBjcmVhdGUgZm9yIHRoZSB3aWRnZXQuIFRoaXMgd2lsbCBiZSB1c2VkIHRvIGRldGVybWluZVxuICAgKiAgIHdoaWNoIHZpZXcgcHJvdG90eXBlIGlzIHVzZWQgdG8gaW5zdGFudGlhdGUgdGhlIHZpZXcuIHZpZXdNb2RlIG11c3QgaGF2ZVxuICAgKiAgIHByZXZpb3VzbHkgYmVlbiByZWdpc3RlcmVkIHRocm91Z2ggdGhlIHJlZ2lzdGVyIG1ldGhvZC5cbiAgICpcbiAgICogQHJldHVybiB7QmFja2JvbmUuVmlld31cbiAgICogICBUaGUgbmV3bHkgY3JlYXRlZCB2aWV3IG9iamVjdC5cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24od2lkZ2V0TW9kZWwsICRlbCwgdmlld01vZGUpIHtcbiAgICBpZiAoIXZpZXdNb2RlKSB7XG4gICAgICB2aWV3TW9kZSA9IHdpZGdldE1vZGVsLmdldCgndmlld01vZGUnKTtcbiAgICB9XG5cbiAgICB2YXIgZGVmID0gdGhpcy5fdmlld01vZGVzW3ZpZXdNb2RlXTtcbiAgICBpZiAoIWRlZikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHZpZXcgbW9kZSBcIicgKyB2aWV3TW9kZSArICdcIicpO1xuICAgIH1cblxuICAgIHZhciBvcHRpb25zID0gZGVmLm9wdGlvbnMgPyBkZWYub3B0aW9ucyA6IHt9O1xuXG4gICAgcmV0dXJuIG5ldyBkZWYucHJvdG90eXBlKF8uZXh0ZW5kKHtcbiAgICAgIG1vZGVsOiB3aWRnZXRNb2RlbCxcbiAgICAgIGFkYXB0ZXI6IHRoaXMuX2FkYXB0ZXIsXG4gICAgICBlbGVtZW50RmFjdG9yeTogdGhpcy5fZWxlbWVudEZhY3RvcnksXG4gICAgICBlbDogJGVsLmdldCgwKSxcbiAgICB9LCBvcHRpb25zKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSB2aWV3IGZvciBhIHdpZGdldCBtb2RlbCwgYW5kIGJsb2NrcyBpdHMgZXZlbnQgaGFuZGxlcnMuXG4gICAqXG4gICAqIEJ5IGRlZmF1bHQsIHZpZXdzIGFyZSBjcmVhdGVkIHdpdGggYSBsb25nLXRlcm0gbGlmZWN5Y2xlIGluIG1pbmQuIFRoZXlcbiAgICogYXR0YWNoIHRoZW1zZWx2ZXMgdG8gdGhlIERPTSwgbGlzdGVuIGZvciBjaGFuZ2VzIHRvIHRoZSBtb2RlbCwgYW5kIHVwZGF0ZVxuICAgKiB0aGUgRE9NLlxuICAgKlxuICAgKiBJbiBjZXJ0YWluIGNhc2VzLCB3ZSBkZXNpcmUgdG8gY3JlYXRlIGEgdmlldyBzaW1wbHkgdG8gdXNlIGl0cyBtYXJrdXBcbiAgICogcHJvY2Vzc2luZyBsb2dpYy4gV2UgZG8gdGhpcyBpbiBvcmRlciB0byB0cmFuc2Zvcm0gbWFya3VwIGludG8gYXBwbGljYXRpb25cbiAgICogc3RhdGUuXG4gICAqXG4gICAqIElmIHdlIHNpbXBseSB1c2UgdGhlIGNyZWF0ZSBtZXRob2QgaW4gdGhpcyBjYXNlLCB2aWV3cyBjYW4gcHJldmVudFxuICAgKiB0aGVtc2VsdmVzIGZyb20gYmVpbmcgZGVzdHJveWVkLCBhbmQgY2FuIGNhdXNlIHVud2FudGVkIHNpZGUtZWZmZWN0cyBieVxuICAgKiBhdHRhY2hpbmcgdGhlaXIgb3duIG5vdGlmaWNhdGlvbiBoYW5kbGVycyB0byB0aGUgbW9kZWwuIFRvIHByZXZlbnQgdGhpcywgXG4gICAqIHdlIHVzZSB0aGlzIG1ldGhvZCB0byBjcmVhdGUgYSBzaG9ydC10ZXJtIGxpZmVjeWNsZSB2aWV3IHRoYXQgY2FuIGJlXG4gICAqIGRpc2NhcmRlZCB3aXRob3V0IHNpZGUtZWZmZWN0cy5cbiAgICpcbiAgICogQHBhcmFtIHtXaWRnZXRNb2RlbH0gd2lkZ2V0TW9kZWxcbiAgICogICBUaGUgd2lkZ2V0IG1vZGVsIHRvIGNyZWF0ZSB0aGUgdmlldyBmb3IuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxcbiAgICogICBBIGpRdWVyeSB3cmFwcGVkIGVsZW1lbnQgZm9yIHRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSB0aGUgcm9vdCBvZiB0aGVcbiAgICogICB2aWV3LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmlld01vZGVcbiAgICogICBUaGUgdmlldyBtb2RlIHRvIGNyZWF0ZSBmb3IgdGhlIHdpZGdldC4gVGhpcyB3aWxsIGJlIHVzZWQgdG8gZGV0ZXJtaW5lXG4gICAqICAgd2hpY2ggdmlldyBwcm90b3R5cGUgaXMgdXNlZCB0byBpbnN0YW50aWF0ZSB0aGUgdmlldy4gdmlld01vZGUgbXVzdCBoYXZlXG4gICAqICAgcHJldmlvdXNseSBiZWVuIHJlZ2lzdGVyZWQgdGhyb3VnaCB0aGUgcmVnaXN0ZXIgbWV0aG9kLlxuICAgKlxuICAgKiBAcmV0dXJuIHtCYWNrYm9uZS5WaWV3fVxuICAgKiAgIFRoZSBuZXdseSBjcmVhdGVkIHZpZXcgb2JqZWN0LCB3aXRoIGFsbCBsaXN0ZW5lcnMgcmVtb3ZlZC5cbiAgICovXG4gIGNyZWF0ZVRlbXBvcmFyeTogZnVuY3Rpb24od2lkZ2V0TW9kZWwsICRlbCwgdmlld01vZGUpIHtcbiAgICByZXR1cm4gdGhpcy5jcmVhdGUod2lkZ2V0TW9kZWwsICRlbCwgdmlld01vZGUpLnN0b3BMaXN0ZW5pbmcoKTtcbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIHRoZSBsb2dpYyBmb3IgZXhlY3V0aW5nIGNvbW1hbmRzIGZyb20gdGhlIHF1ZXVlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhZywgYXR0cmlidXRlTWFwLCBzZWxlY3RvciwgZGF0YSkge1xuICB2YXIgZWxlbWVudCA9IHRoaXM7XG5cbiAgaWYgKCFhdHRyaWJ1dGVNYXApIHtcbiAgICBhdHRyaWJ1dGVNYXAgPSB7fTtcbiAgfVxuXG4gIHRoaXMuX3RhZyA9IHRhZztcbiAgdGhpcy5fYXR0cmlidXRlTWFwID0gYXR0cmlidXRlTWFwO1xuICB0aGlzLl9zZWxlY3RvciA9IHNlbGVjdG9yO1xuICB0aGlzLl9pbnZlcnRlZEF0dHJpYnV0ZU1hcCA9IHt9O1xuICBfLmVhY2goYXR0cmlidXRlTWFwLCBmdW5jdGlvbihhdHRyaWJ1dGVfdmFsdWUsIGF0dHJpYnV0ZV9uYW1lKSB7XG4gICAgZWxlbWVudC5faW52ZXJ0ZWRBdHRyaWJ1dGVNYXBbZWxlbWVudC5fZ2V0RGF0YUtleShhdHRyaWJ1dGVfdmFsdWUpXSA9IGF0dHJpYnV0ZV9uYW1lO1xuICB9KTtcblxuICBpZiAoIWRhdGEpIHtcbiAgICBkYXRhID0ge307XG4gIH1cblxuICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuICBfLmVhY2goYXR0cmlidXRlTWFwLCBmdW5jdGlvbihhdHRyaWJ1dGVfdmFsdWUsIGF0dHJpYnV0ZV9uYW1lKSB7XG4gICAgdmFyIGRhdGFLZXkgPSBlbGVtZW50Ll9nZXREYXRhS2V5KGF0dHJpYnV0ZV92YWx1ZSk7XG4gICAgaWYgKGRhdGFLZXkpIHtcbiAgICAgIGlmIChkYXRhW2RhdGFLZXldKSB7XG4gICAgICAgIGF0dHJpYnV0ZXNbYXR0cmlidXRlX25hbWVdID0gZGF0YVtkYXRhS2V5XTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV9uYW1lXSA9IGF0dHJpYnV0ZV92YWx1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIHRoaXMuX2F0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzO1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqL1xuICBnZXRUYWc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl90YWc7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRBdHRyaWJ1dGVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fYXR0cmlidXRlcztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldEF0dHJpYnV0ZU5hbWVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy5rZXlzKHRoaXMuX2F0dHJpYnV0ZU1hcCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBzZXRBdHRyaWJ1dGU6IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5fYXR0cmlidXRlc1t0aGlzLmdldEF0dHJpYnV0ZU5hbWUobmFtZSldID0gdmFsdWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRBdHRyaWJ1dGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fYXR0cmlidXRlc1t0aGlzLmdldEF0dHJpYnV0ZU5hbWUobmFtZSldO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0QXR0cmlidXRlTmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBkYXRhS2V5ID0gdGhpcy5fZ2V0RGF0YUtleShuYW1lKTtcbiAgICBpZiAoZGF0YUtleSAmJiB0aGlzLl9pbnZlcnRlZEF0dHJpYnV0ZU1hcFtkYXRhS2V5XSkge1xuICAgICAgbmFtZSA9IHRoaXMuX2ludmVydGVkQXR0cmlidXRlTWFwW2RhdGFLZXldO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHJlbmRlck9wZW5pbmdUYWc6IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXN1bHQgPSAnPCcgKyB0aGlzLmdldFRhZygpO1xuXG4gICAgXy5lYWNoKHRoaXMuZ2V0QXR0cmlidXRlcygpLCBmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgcmVzdWx0ICs9ICcgJyArIG5hbWUgKyAnPVwiJyArIHZhbHVlICsgJ1wiJztcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQgKyAnPic7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICByZW5kZXJDbG9zaW5nVGFnOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJzwvJyArIHRoaXMuZ2V0VGFnKCkgKyAnPic7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRTZWxlY3RvcjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSB0aGlzLmdldEF0dHJpYnV0ZXMoKTtcbiAgICB2YXIgc2VsZWN0b3IgPSAnJztcblxuICAgIGlmICh0aGlzLl9zZWxlY3Rvcikge1xuICAgICAgc2VsZWN0b3IgPSB0aGlzLl9zZWxlY3RvcjtcbiAgICB9XG4gICAgZWxzZSBpZiAoYXR0cmlidXRlc1snY2xhc3MnXSkge1xuICAgICAgdmFyIGNsYXNzZXMgPSBhdHRyaWJ1dGVzWydjbGFzcyddLnNwbGl0KCcgJyk7XG4gICAgICBfLmVhY2goY2xhc3NlcywgZnVuY3Rpb24oY2xhc3NuYW1lKSB7XG4gICAgICAgIHNlbGVjdG9yICs9ICcuJyArIGNsYXNzbmFtZTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHNlbGVjdG9yID0gdGhpcy5nZXRUYWcoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VsZWN0b3I7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBfZ2V0RGF0YUtleTogZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciByZWdleCA9IC9ePChbYS16XFwtXSspPiQvO1xuICAgIHZhciBwYXJzZWQgPSByZWdleC5leGVjKG5hbWUpO1xuICAgIGlmIChwYXJzZWQgJiYgcGFyc2VkWzFdKSB7XG4gICAgICByZXR1cm4gcGFyc2VkWzFdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyB0aGUgbG9naWMgZm9yIGV4ZWN1dGluZyBjb21tYW5kcyBmcm9tIHRoZSBxdWV1ZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBFbGVtZW50ID0gcmVxdWlyZSgnLi9FbGVtZW50Jyk7XG5cbi8qKlxuICogQSBmYWN0b3J5IGZvciBjcmVhdGluZyBFbGVtZW50IG9iamVjdHMuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGVsZW1lbnRzXG4gKiAgIERlZmluaXRpb25zIG9mIGVsZW1lbnQgdHlwZXMgdGhhdCBjYW4gYmUgY3JlYXRlZCBieSB0aGlzIGZhY3RvcnkuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudHMpIHtcbiAgdGhpcy5fZWxlbWVudHMgPSBlbGVtZW50cztcblxuICBfLmVhY2godGhpcy5fZWxlbWVudHMsIGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICBpZiAoIWVsZW1lbnQuYXR0cmlidXRlcykge1xuICAgICAgZWxlbWVudC5hdHRyaWJ1dGVzID0ge307XG4gICAgfVxuICB9KTtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVsZW1lbnQgb2JqZWN0IHdpdGggbm8gZGF0YS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogICBUaGUgdHlwZSBvZiBlbGVtZW50IHRvIGdldCBhIHRlbXBsYXRlIGZvci5cbiAgICpcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICogICBUaGUgY3JlYXRlZCBlbGVtZW50IG9iamVjdCwgd2l0aCBubyBhZGRpdGlvbmFsIGRhdGEuXG4gICAqL1xuICBnZXRUZW1wbGF0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZShuYW1lKTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBlbGVtZW50IGluc3RhbmNlIHdpdGggc3BlY2lmaWMgZGF0YSBhdHRyaWJ1dGVzLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiAgIFRoZSB0eXBlIG9mIGVsZW1lbnQgdG8gY3JlYXRlZCBhcyBkZWZpbmVkIGluIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGFcbiAgICogICBUaGUgZGF0YSB0byB1c2UgdG8gZmlsbCBpbiB0aGUgZWxlbWVudCBhdHRyaWJ1dGVzIGJhc2VkIG9uIHRoZSB0eXBlXG4gICAqICAgZGVmaW5pdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICogICBUaGUgY3JlYXRlZCBlbGVtZW50IG9iamVjdCwgd2l0aCB0aGUgcGFzc2VkIGF0dHJpYnV0ZSBkYXRhIGZpbGxlZCBpbi5cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24obmFtZSwgZGF0YSkge1xuICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMuX2VsZW1lbnRzW25hbWVdO1xuICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBlbGVtZW50IHR5cGUuJyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgRWxlbWVudCh0ZW1wbGF0ZS50YWcsIHRlbXBsYXRlLmF0dHJpYnV0ZXMsIHRlbXBsYXRlLnNlbGVjdG9yLCBkYXRhKTtcbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIGEgbW9kZWwgZm9yIHJlcHJlc2VudGluZyBhIGNvbnRleHQuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG4gIHR5cGU6ICdDb250ZXh0JyxcblxuICBkZWZhdWx0czoge1xuICAgIGZpZWxkOiAnJyxcbiAgICBzZXR0aW5nczoge30sXG4gIH0sXG5cbiAgLyoqXG4gICAqIHtAaW5oZXJpdGRvY31cbiAgICovXG4gIGNvbnN0cnVjdG9yOiBmdW5jdGlvbihhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgdGhpcy5lZGl0QnVmZmVyID0gb3B0aW9ucy5lZGl0QnVmZmVyO1xuICAgIGlmICghYXR0cmlidXRlcy5zZXR0aW5ncykge1xuICAgICAgYXR0cmlidXRlcy5zZXR0aW5ncyA9IHt9O1xuICAgIH1cbiAgICBCYWNrYm9uZS5Nb2RlbC5hcHBseSh0aGlzLCBbYXR0cmlidXRlcywgb3B0aW9uc10pO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgc2V0OiBmdW5jdGlvbihhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgaWYgKGF0dHJpYnV0ZXMuZWRpdEJ1ZmZlckl0ZW1zKSB7XG4gICAgICB0aGlzLmVkaXRCdWZmZXIuYWRkKGF0dHJpYnV0ZXMuZWRpdEJ1ZmZlckl0ZW1zLCB7bWVyZ2U6IHRydWV9KTtcbiAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzLmVkaXRCdWZmZXJJdGVtcztcbiAgICB9XG5cbiAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsIGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0U2V0dGluZ3M6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmdldCgnc2V0dGluZ3MnKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldFNldHRpbmc6IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiB0aGlzLmdldCgnc2V0dGluZ3MnKVtrZXldO1xuICB9LFxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgbW9kZWwgZm9yIHJlcHJlc2VudGluZyBlZGl0IGJ1ZmZlciBpdGVtcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICogQmFja2JvbmUgIE1vZGVsIGZvciByZXByZXNlbnRpbmcgY29tbWFuZHMuXG4gKlxuICogVGhlIGlkIGZvciB0aGlzIG1vZGVsIGlzIHRoZSB1dWlkIG9mIGEgZGF0YSBlbnRpdHkgdGhhdCB0aGUgaXRlbVxuICogY29ycmVzcG9uZHMgdG8uXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnRWRpdEJ1ZmZlckl0ZW0nLFxuXG4gIC8qKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKlxuICAgKiBAcHJvcCBtYXJrdXBcbiAgICovXG4gIGRlZmF1bHRzOiB7XG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGUgaXRlbSBpcyByZWFkeSB0byBiZSBpbnNlcnRlZC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgJ2luc2VydCc6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGl0ZW0gbWFya3VwLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICAnbWFya3VwJzogJy4uLicsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaXRlbSBtYXJrdXAuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgICd0eXBlJzogJycsXG5cbiAgICAnZmllbGRzJzoge31cbiAgfSxcblxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnRWRpdG9yJyxcblxuICAvKipcbiAgICoge0Bpbmhlcml0ZG9jfVxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oYXR0cmlidXRlcywgY29uZmlnKSB7XG4gICAgdGhpcy53aWRnZXRGYWN0b3J5ID0gY29uZmlnLndpZGdldEZhY3Rvcnk7XG4gICAgdGhpcy52aWV3RmFjdG9yeSA9IGNvbmZpZy52aWV3RmFjdG9yeTtcbiAgICB0aGlzLndpZGdldFN0b3JlID0gY29uZmlnLndpZGdldFN0b3JlO1xuICAgIHRoaXMuZWRpdEJ1ZmZlck1lZGlhdG9yID0gY29uZmlnLmVkaXRCdWZmZXJNZWRpYXRvcjtcbiAgICB0aGlzLmNvbnRleHQgPSBjb25maWcuY29udGV4dDtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29udGV4dCwgJ2NoYW5nZTppZCcsIHRoaXMuX3VwZGF0ZUNvbnRleHRJZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBfdXBkYXRlQ29udGV4dElkOiBmdW5jdGlvbihjb250ZXh0TW9kZWwpIHtcbiAgICB0aGlzLnNldCh7IGlkOiBjb250ZXh0TW9kZWwuZ2V0KCdpZCcpIH0pO1xuICB9LFxuXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIHRoaXMud2lkZ2V0U3RvcmUuY2xlYW51cCgpO1xuICAgIHRoaXMuZWRpdEJ1ZmZlck1lZGlhdG9yLmNsZWFudXAoKTtcbiAgfVxuXG59KTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgbW9kZWwgZm9yIHJlcHJlc2VudGluZyBhIHNjaGVtYSBlbnRyeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICogQmFja2JvbmUgIE1vZGVsIGZvciByZXByZXNlbnRpbmcgYSBzY2hlbWEgZW50cnkuXG4gKlxuICogVGhlIGlkIGZvciB0aGlzIG1vZGVsIGlzIHRoZSB1dWlkIG9mIGEgZGF0YSBlbnRpdHkgdGhhdCB0aGUgaXRlbVxuICogY29ycmVzcG9uZHMgdG8uXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnU2NoZW1hJyxcblxuICAvKipcbiAgICogQHR5cGUge29iamVjdH1cbiAgICpcbiAgICogQHByb3AgbWFya3VwXG4gICAqL1xuICBkZWZhdWx0czoge1xuXG4gICAgJ2FsbG93ZWQnOiB7fSxcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGlzQWxsb3dlZDogZnVuY3Rpb24oYnVuZGxlTmFtZSkge1xuICAgIHJldHVybiAhIXRoaXMuZ2V0KCdhbGxvd2VkJylbYnVuZGxlTmFtZV07XG4gIH0sXG5cbn0pO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogQSBCYWNrYm9uZSBtb2RlbCBmb3IgcmVwcmVzZW50aW5nIGVkaXRvciB3aWRnZXRzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxudmFyIFN0YXRlID0ge1xuICBSRUFEWTogMHgwMSxcbiAgREVTVFJPWUVEX1dJREdFVDogMHgwMixcbiAgREVTVFJPWUVEX1JFRlM6IDB4MDQsXG4gIERFU1RST1lFRDogMHgwNixcbn07XG5cbi8qKlxuICogQmFja2JvbmUgIE1vZGVsIGZvciByZXByZXNlbnRpbmcgZWRpdG9yIHdpZGdldHMuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuICB0eXBlOiAnV2lkZ2V0JyxcblxuICAvKipcbiAgICogQHR5cGUge29iamVjdH1cbiAgICpcbiAgICogQHByb3AgbWFya3VwXG4gICAqL1xuICBkZWZhdWx0czoge1xuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdG8gYmUgc2VudCB3aXRoIHRoZSBjb21tYW5kLlxuICAgICAqXG4gICAgICogQHR5cGUge2ludH1cbiAgICAgKi9cbiAgICBpdGVtSWQ6IDAsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgY29udGV4dCB0aGUgd2lkZ2V0IGlzIGluLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBjb250ZXh0SWQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGludGVybmFsIG1hcmt1cCB0byBkaXNwbGF5IGluIHRoZSB3aWRnZXQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1hcmt1cDogJycsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0byBiZSBzZW50IHdpdGggdGhlIGNvbW1hbmQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGVkaXRzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgb3Igbm90IHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0gaXMgYmVpbmcgZHVwbGljYXRlZC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtib29sfVxuICAgICAqL1xuICAgIGR1cGxpY2F0aW5nOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkZXN0cnVjdGlvbiBzdGF0ZSBmb3IgdGhlIHdpZGdldC5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtpbnR9XG4gICAgICovXG4gICAgc3RhdGU6IFN0YXRlLlJFQURZLFxuICB9LFxuXG4gIC8qKlxuICAgKiB7QGluaGVyaXRkb2N9XG4gICAqL1xuICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gKGF0dHJpYnV0ZXMsIG9wdGlvbnMpIHtcbiAgICB0aGlzLndpZGdldCA9IG9wdGlvbnMud2lkZ2V0O1xuICAgIHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeSA9IG9wdGlvbnMuZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5O1xuICAgIHRoaXMuX2NvbnRleHRSZXNvbHZlciA9IG9wdGlvbnMuY29udGV4dFJlc29sdmVyO1xuICAgIEJhY2tib25lLk1vZGVsLmFwcGx5KHRoaXMsIFthdHRyaWJ1dGVzLCBvcHRpb25zXSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHtAaW5oZXJpdGRvY31cbiAgICovXG4gIHNldDogZnVuY3Rpb24oYXR0cmlidXRlcywgb3B0aW9ucykge1xuICAgIHRoaXMuX2ZpbHRlckF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XG4gICAgcmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgfSxcblxuICAvKipcbiAgICogVHJpZ2dlcnMgYSByZXF1ZXN0IHRvIGVkaXQgdGhlIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbS5cbiAgICovXG4gIGVkaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYuZWRpdCh0aGlzLmdldCgnZWRpdHMnKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIGEgcmVxdWVzdCB0byBkdXBsaWNhdGUgdGhlIHJlZmVyZW5jZWQgZWRpdCBidWZmZXIgaXRlbS5cbiAgICovXG4gIGR1cGxpY2F0ZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXQoeyBkdXBsaWNhdGluZzogdHJ1ZSB9KTtcbiAgICB0aGlzLmVkaXRCdWZmZXJJdGVtUmVmLmR1cGxpY2F0ZSh0aGlzLmdldCgnaWQnKSwgdGhpcy5nZXQoJ2VkaXRzJykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBhIGNoYWluIG9mIGV2ZW50cyB0byBkZWxldGUgLyBjbGVhbiB1cCBhZnRlciB0aGlzIHdpZGdldC5cbiAgICovXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAvLyBJZiB0aGUgd2lkZ2V0IGhhcyBub3QgYWxyZWFkeSBiZWVuIG1hcmtlZCBhcyBkZXN0cm95ZWQgd2UgdHJpZ2dlciBhXG4gICAgLy8gZGVzdHJveSBldmVudCBvbiB0aGUgd2lkZ2V0IGNvbGxlY3Rpb24gc28gaXQgY2FuIGluc3RydWN0IGFueXRoaW5nIHRoYXRcbiAgICAvLyByZWZlcmVuY2VzIHRoaXMgd2lkZ2V0IHRvIGNsZWFuIGl0IG91dC4gUmVkdW5kYW50IGRlc3Ryb3kgY2FsbHMgYXJlXG4gICAgLy8gaWdub3JlZC5cbiAgICBpZiAoIXRoaXMuaGFzU3RhdGUoU3RhdGUuREVTVFJPWUVEKSkge1xuICAgICAgdGhpcy50cmlnZ2VyKCdkZXN0cm95JywgdGhpcywgdGhpcy5jb2xsZWN0aW9uLCBvcHRpb25zKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoU3RhdGUuREVTVFJPWUVEKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIGRlc3RydWN0aW9uIHN0YXRlIGZvciB0aGlzIHdpZGdldC5cbiAgICovXG4gIHNldFN0YXRlOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgIHJldHVybiB0aGlzLnNldCh7c3RhdGU6IHRoaXMuZ2V0KCdzdGF0ZScpIHwgc3RhdGV9KTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBkZXN0cnVjdGlvbiBzdGF0ZSBmb3IgdGhpcyB3aWRnZXQuXG4gICAqL1xuICBoYXNTdGF0ZTogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICByZXR1cm4gKHRoaXMuZ2V0KCdzdGF0ZScpICYgc3RhdGUpID09PSBzdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIF9maWx0ZXJBdHRyaWJ1dGVzOiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgLy8gUnVuIHRoZSBjaGFuZ2UgaGFuZGxlciB0byByZWJ1aWxkIGFueSByZWZlcmVuY2VzIHRvIGV4dGVybmFsIG1vZGVsc1xuICAgIC8vIGlmIG5lY2Vzc2FyeS4gV2UgZG8gdGhpcyBoZXJlIGluc3RlYWQgb2Ygb24oJ2NoYW5nZScpIHRvIGVuc3VyZSB0aGF0XG4gICAgLy8gc3Vic2NyaWJlZCBleHRlcm5hbCBsaXN0ZW5lcnMgZ2V0IGNvbnNpc3RlbnQgYXRvbWljIGNoYW5nZVxuICAgIC8vIG5vdGlmaWNhdGlvbnMuXG4gICAgaWYgKHRoaXMuX3JlZnJlc2hFZGl0QnVmZmVySXRlbVJlZihhdHRyaWJ1dGVzKSB8fCBhdHRyaWJ1dGVzLmVkaXRzKSB7XG4gICAgICB0aGlzLl9zZXR1cExpc3RlbmVycyhhdHRyaWJ1dGVzKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsIGZ1bmN0aW9uIHRvIGhhbmRsZSBjaGFuZ2VzIHRvIHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0uXG4gICAqL1xuICBfcmVmcmVzaEVkaXRCdWZmZXJJdGVtUmVmOiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgLy8gVHJhY2sgd2hldGhlciB3ZSBuZWVkIHRvIHVwZGF0ZSB3aGljaCByZWZlcmVuY2VkIG1vZGVscyB3ZSBhcmVcbiAgICAvLyBsaXN0ZW5pbmcgdG8uXG4gICAgdmFyIHNldHVwTGlzdGVuZXJzID0gZmFsc2U7XG5cbiAgICAvLyBHZXQgdGhlIGNvbnNvbGlkYXRlZCBsaXN0IG9mIG9sZCAvIHVwZGF0ZWQgcHJvcGVydGllcyB0byBjaGVjayBmb3JcbiAgICAvLyBjaGFuZ2VzLlxuICAgIHZhciBvbGRJdGVtQ29udGV4dCA9IHRoaXMuZ2V0KCdpdGVtQ29udGV4dElkJyk7XG4gICAgdmFyIG9sZFdpZGdldENvbnRleHQgPSB0aGlzLmdldCgnY29udGV4dElkJyk7XG4gICAgdmFyIG9sZEl0ZW1JZCA9IHRoaXMuZ2V0KCdpdGVtSWQnKTtcbiAgICB2YXIgbmV3SXRlbUNvbnRleHQgPSBhdHRyaWJ1dGVzLml0ZW1Db250ZXh0SWQgPyBhdHRyaWJ1dGVzLml0ZW1Db250ZXh0SWQgOiBvbGRJdGVtQ29udGV4dDtcbiAgICB2YXIgbmV3V2lkZ2V0Q29udGV4dCA9IGF0dHJpYnV0ZXMuY29udGV4dElkID8gYXR0cmlidXRlcy5jb250ZXh0SWQgOiBvbGRXaWRnZXRDb250ZXh0O1xuICAgIHZhciBuZXdJdGVtSWQgPSBhdHRyaWJ1dGVzLml0ZW1JZCA/IGF0dHJpYnV0ZXMuaXRlbUlkIDogb2xkSXRlbUlkO1xuXG4gICAgLy8gSWYgdGhlIGNvbnRleHQgdGhlIGJ1ZmZlciBpdGVtIGhhcyBjaGFuZ2VkLCB0aGUgY29udGV4dCBvZiB0aGUgd2lkZ2V0XG4gICAgLy8gaGFzIGNoYW5nZWQsIG9yIHRoZSByZWZlcmVuY2VkIGVkaXQgYnVmZmVyIGl0ZW0gaWQgaGFzIGNoYW5nZWQgd2UgbmVlZFxuICAgIC8vIHRvIHJlZ2VuZXJhdGUgdGhlIGVkaXQgYnVmZmVyIGl0ZW0gcmVmZXJlbmNlIGFuZCBpbnN0cnVjdCB0aGUgY2FsbGVyIHRvXG4gICAgLy8gdXBkYXRlIHRoZSBtb2RlbHMgdGhpcyB3aWRnZXQgaXMgbGlzdGVuaW5nIHRvLlxuICAgIGlmIChuZXdJdGVtQ29udGV4dCAhPSBvbGRJdGVtQ29udGV4dCB8fCBuZXdXaWRnZXRDb250ZXh0ICE9IG9sZFdpZGdldENvbnRleHQgfHwgbmV3SXRlbUlkICE9IG9sZEl0ZW1JZCkge1xuICAgICAgdGhpcy5lZGl0QnVmZmVySXRlbVJlZiA9IHRoaXMuX2VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeS5jcmVhdGVGcm9tSWRzKG5ld0l0ZW1JZCwgbmV3SXRlbUNvbnRleHQsIG5ld1dpZGdldENvbnRleHQpO1xuICAgICAgc2V0dXBMaXN0ZW5lcnMgPSB0cnVlO1xuICAgICAgYXR0cmlidXRlcy5tYXJrdXAgPSB0aGlzLmVkaXRCdWZmZXJJdGVtUmVmLmVkaXRCdWZmZXJJdGVtLmdldCgnbWFya3VwJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNldHVwTGlzdGVuZXJzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGFueSBzdGFsZSBsaXN0ZW5lcnMgYW5kIHNldHMgdXAgZnJlc2ggbGlzdGVuZXJzLlxuICAgKi9cbiAgX3NldHVwTGlzdGVuZXJzOiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKClcbiAgICAgIC5saXN0ZW5Ubyh0aGlzLmVkaXRCdWZmZXJJdGVtUmVmLmVkaXRCdWZmZXJJdGVtLCAnY2hhbmdlOm1hcmt1cCcsIHRoaXMuX3JlYWRGcm9tQnVmZmVySXRlbSlcbiAgICAgIC5saXN0ZW5Ubyh0aGlzLmVkaXRCdWZmZXJJdGVtUmVmLnNvdXJjZUNvbnRleHQsICdjaGFuZ2U6aWQnLCB0aGlzLl91cGRhdGVDb250ZXh0KVxuICAgICAgLmxpc3RlblRvKHRoaXMuZWRpdEJ1ZmZlckl0ZW1SZWYudGFyZ2V0Q29udGV4dCwgJ2NoYW5nZTppZCcsIHRoaXMuX3VwZGF0ZUNvbnRleHQpO1xuXG4gICAgXy5lYWNoKGF0dHJpYnV0ZXMuZWRpdHMsIGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0U3RyaW5nKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMuX2NvbnRleHRSZXNvbHZlci5nZXQoY29udGV4dFN0cmluZyk7XG4gICAgICB0aGlzLmxpc3RlblRvKGNvbnRleHQsICdjaGFuZ2U6aWQnLCB0aGlzLl91cGRhdGVDb250ZXh0KTtcbiAgICB9LCB0aGlzKTtcbiAgfSxcblxuICAvKipcbiAgICogSW50ZXJuYWwgZnVuY3Rpb24gdG8gY29weSB1cGRhdGVzIGZyb20gdGhlIHJlZmVyZW5jZWQgYnVmZmVyIGl0ZW0uXG4gICAqL1xuICBfcmVhZEZyb21CdWZmZXJJdGVtOiBmdW5jdGlvbihidWZmZXJJdGVtTW9kZWwpIHtcbiAgICB0aGlzLnNldCh7bWFya3VwOiBidWZmZXJJdGVtTW9kZWwuZ2V0KCdtYXJrdXAnKX0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBmdW5jdGlvbiB0byBoYW5kbGUgd2hlbiBhIHJlZmVyZW5jZWQgY29udGV4dCBpZCBoYXMgY2hhbmdlZC5cbiAgICovXG4gIF91cGRhdGVDb250ZXh0OiBmdW5jdGlvbihjb250ZXh0TW9kZWwpIHtcbiAgICB2YXIgb2xkSWQgPSBjb250ZXh0TW9kZWwucHJldmlvdXMoJ2lkJyk7XG4gICAgdmFyIG5ld0lkID0gY29udGV4dE1vZGVsLmdldCgnaWQnKTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuXG4gICAgLy8gVXBkYXRlIGFueSBjb250ZXh0IGlkIHJlZmVyZW5jZXMgdGhhdCBtYXkgbmVlZCB0byBjaGFuZ2UuXG4gICAgaWYgKHRoaXMuZ2V0KCdpdGVtQ29udGV4dElkJykgPT0gb2xkSWQpIHtcbiAgICAgIGF0dHJpYnV0ZXMuaXRlbUNvbnRleHRJZCA9IG5ld0lkO1xuICAgIH1cbiAgICBpZiAodGhpcy5nZXQoJ2NvbnRleHRJZCcpID09IG9sZElkKSB7XG4gICAgICBhdHRyaWJ1dGVzLmNvbnRleHRJZCA9IG5ld0lkO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBjb250ZXh0IHdhcyByZWZlcmVuY2VkIGJ5IGFuIGVkaXQgb24gdGhlIG1vZGVsLCB1cGRhdGUgdGhlIGVkaXQuXG4gICAgdmFyIGVkaXRzID0gdGhpcy5nZXQoJ2VkaXRzJyk7XG4gICAgaWYgKGVkaXRzW29sZElkXSkge1xuICAgICAgYXR0cmlidXRlcy5lZGl0cyA9IHt9O1xuICAgICAgXy5lYWNoKGVkaXRzLCBmdW5jdGlvbih2YWx1ZSwgY29udGV4dFN0cmluZykge1xuICAgICAgICBpZiAoY29udGV4dFN0cmluZyA9PSBvbGRJZCkge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZWRpdHNbbmV3SWRdID0gdmFsdWUucmVwbGFjZShvbGRJZCwgbmV3SWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZWRpdHNbY29udGV4dFN0cmluZ10gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy5zZXQoYXR0cmlidXRlcywge3NpbGVudDogdHJ1ZX0pO1xuICB9LFxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMuU3RhdGUgPSBTdGF0ZTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIFByb3ZpZGVzIHRoZSBsb2dpYyBmb3IgZXhlY3V0aW5nIGNvbW1hbmRzIGZyb20gdGhlIHF1ZXVlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuLyoqXG4gKiBNYXJrcyBhIG1ldGhvZCBhcyBhbiBpbnRlcmZhY2Ugc3R1Yi5cbiAqL1xuZnVuY3Rpb24gdW5pbXBsZW1lbnRlZCgpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdVbmltcGxlbWVudGVkIG1ldGhvZC4nKTtcbn1cblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cy5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogSW5zZXJ0cyBhbiBlbWJlZCBjb2RlIGludG8gdGhlIGVkaXRvci5cbiAgICpcbiAgICogVGhpcyBzaG91bGQgaW5zZXJ0IHRoZSBuZXdseSBjcmVhdGVkIGVsZW1lbnQgYXQgdGhlIGN1cnJlbnQgZWRpdGFibGUgY3Vyc29yXG4gICAqIHBvc2l0aW9uIHdpdGhpbiB0aGUgZWRpdG9yLlxuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVtYmVkQ29kZVxuICAgKiAgIFRoZSBlbWJlZCBjb2RlIGVsZW1lbnQgdG8gYmUgaW5zZXJ0ZWQuXG4gICAqL1xuICBpbnNlcnRFbWJlZENvZGU6IGZ1bmN0aW9uKGVtYmVkQ29kZSkge1xuICAgIHVuaW1wbGVtZW50ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIHdpZGdldCBmcm9tIHRoZSBlZGl0b3IuXG4gICAqXG4gICAqIFRoaXMgc2hvdWxkIHJlbW92ZSB0aGUgd2lkZ2V0IGJhc2VkIG9uIGl0cyB1bmlxdWUgaWQgYW5kIGZyZWUgYW55XG4gICAqIGFzc29jaWF0ZWQgbWVtb3J5LlxuICAgKlxuICAgKiBAcGFyYW0ge2ludH0gaWRcbiAgICogICBUaGUgaWQgb2YgdGhlIHdpZGdldCB0byBiZSBkZXN0cm95ZWQuXG4gICAqL1xuICBkZXN0cm95V2lkZ2V0OiBmdW5jdGlvbihpZCkge1xuICAgIHVuaW1wbGVtZW50ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0cyB1cCBhbiBpbmxpbmUgZWRpdGFibGUgZmllbGQgd2l0aGluIGEgd2lkZ2V0LlxuICAgKlxuICAgKiBUaGUgd2lkZ2V0VmlldyBwYXJhbWV0ZXIgZ2l2ZXMgdGhlIGFkYXB0ZXIgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCB0aGF0XG4gICAqIHNob3VsZCBiZSBpbmxpbmUtZWRpdGFibGUuIFRoZSBjb250ZXh0SWQgYWxsb3dzIGFjY2VzcyB0byB0aGUgY3VycmVudFxuICAgKiBpbmxpbmUgZWRpdHMgZm9yIHRoZSBwYXJ0aWN1bGFyIGNvbnRleHQsIGFuZCB0aGUgc2VsZWN0b3IgaXMgYSBqUXVlcnkgc3R5bGVcbiAgICogc2VsZWN0b3IgZGljdGF0aW5nIHdoaWNoIG5vZGUgaW4gdGhlIHdpZGdldFZpZXcgRE9NIHdpbGwgYmVjb21lXG4gICAqIGlubGluZS1lZGl0YWJsZS5cbiAgICpcbiAgICogQHBhcmFtIHtCYWNrYm9uZS5WaWV3fSB3aWRnZXRWaWV3XG4gICAqICAgVGhlIHZpZXcgZm9yIHRoZSB3aWRnZXQgdGhhdCBjb250YWlucyB0aGUgZmllbGQgdGhhdCB3aWxsIGJlY29tZVxuICAgKiAgIGVkaXRhYmxlLlxuICAgKiBAcGFyYW0ge21peGVkfSBjb250ZXh0SWRcbiAgICogICBUaGUgY29udGV4dCBpZCB0byBvZiB0aGUgZmllbGQgdGhhdCBzaG91bGQgYmVjb21lIGlubGluZSBlZGl0YWJsZS4gRWFjaFxuICAgKiAgIGVkaXRhYmxlIGZpZWxkIGRlZmluZXMgYSB1bmlxdWUgY29udGV4dCBmb3IgaXRzIGNoaWxkcmVuLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3JcbiAgICogICBBIGpRdWVyeSBzdHlsZSBzZWxlY3RvciBmb3Igc3BlY2lmeWluZyB3aGljaCBlbGVtZW50IHdpdGhpbiB0aGUgd2lkZ2V0XG4gICAqICAgc2hvdWxkIGJlY29tZSBlZGl0YWJsZS4gVGhlIHNlbGVjdG9yIGlzIHJlbGF0aXZlIHRvIHRoZSB2aWV3J3Mgcm9vdCBlbFxuICAgKiAgIHByb3BlcnR5LlxuICAgKi9cbiAgYXR0YWNoSW5saW5lRWRpdGluZzogZnVuY3Rpb24od2lkZ2V0VmlldywgY29udGV4dElkLCBzZWxlY3Rvcikge1xuICAgIHVuaW1wbGVtZW50ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVhZHMgdGhlIGlubGluZSBlZGl0IGZvciBhbiBlZGl0YWJsZSB3aWRnZXQgZmllbGQgZnJvbSB0aGUgd2lkZ2V0J3MgRE9NLlxuICAgKlxuICAgKiBAcGFyYW0ge0JhY2tib25lLlZpZXd9IHdpZGdldFZpZXdcbiAgICogICBUaGUgdmlldyBmb3IgdGhlIHdpZGdldCB0aGF0IGNvbnRhaW5zIHRoZSBmaWVsZCB0byByZWFkIGlubGluZSBlZGl0c1xuICAgKiAgIGZyb20uXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGNvbnRleHRJZFxuICAgKiAgIFRoZSBjb250ZXh0IGlkIHRvIHJlYWQgdGhlIGlubGluZSBlZGl0IGZyb20uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvclxuICAgKiAgIEEgalF1ZXJ5IHN0eWxlIHNlbGVjdG9yIGZvciBzcGVjaWZ5aW5nIHdoaWNoIGVsZW1lbnQgd2l0aGluIHRoZSB3aWRnZXRcbiAgICogICBzaG91bGQgdGhlIGlubGluZSBlZGl0cyBzaG91bGQgYmUgcmVhZCBmcm9tLiBUaGUgc2VsZWN0b3IgaXMgcmVsYXRpdmUgdG9cbiAgICogICB0aGUgdmlldydzIHJvb3QgZWwgcHJvcGVydHkuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICogICBUaGUgcHJvY2Vzc2VkIGlubGluZSBlZGl0IG1hcmt1cCBmb3IgdGhlIHNwZWNpZmllZCBjb250ZXh0SWQuXG4gICAqL1xuICBnZXRJbmxpbmVFZGl0OiBmdW5jdGlvbih3aWRnZXRWaWV3LCBjb250ZXh0SWQsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIHVuaW1wbGVtZW50ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgcm9vdCBET00gZWxlbWVudCBmb3IgdGhlIGVkaXRvci5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgdGVsbHMgdGhlIGVkaXRvciBob3cgdG8gXG4gICAqXG4gICAqIEByZXR1cm4ge0RPTUVsZW1lbnR9XG4gICAqICAgVGhlIHJvb3QgRE9NIGVsZW1lbnQgZm9yIHRoZSBlZGl0b3IuXG4gICAqL1xuICBnZXRSb290RWw6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB1bmltcGxlbWVudGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFuIG9wdGlvbmFsIG1ldGhvZCBmb3IgcGVyZm9ybWluZyBhbnkgY2xlYW51cCBhZnRlciB0cmFja2VyIGRlc3RydWN0aW9uLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIHdpZGdldCB0cmFja2VyIGhhcyBiZWVuIGRlc3Ryb3llZC4gSXQgaXNcbiAgICogdXN1YWxseSBub3QgbmVjZXNzYXJ5IHRvIGltcGxlbWVudCB0aGlzIG1ldGhvZC5cbiAgICovXG4gIGNsZWFudXA6IGZ1bmN0aW9uKCkge1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cy5leHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBQcm92aWRlcyBhbiBpbnRlcmZhY2UgZm9yIHByb3RvY29sIHBsdWdpbnMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG4vKipcbiAqIEEgYmFzZSBmb3IgcHJvdG9jb2wgcGx1Z2lucy5cbiAqXG4gKiBQcm90b2NvbCBwbHVnaW5zIGhhbmRsZSB0aGUgcmVxdWVzdCAvIHJlc3BvbnNlIG1lY2hhbmlzbSBmb3Igc3luY2luZyBkYXRhIHRvXG4gKiBhbmQgZnJvbSB0aGUgc2VydmVyLiBUaGV5IHByb3ZpZGUgYSBzaW5nbGUgbWV0aG9kICdzZW5kJyB0aGF0IHdpbGwgYmUgY2FsbGVkXG4gKiB3aGVuIHJlcXVlc3RzIGFyZSBkaXNwYXRjaGVkLlxuICpcbiAqIFRoZSBjb21tYW5kIHJlc29sdmVyIGlzIHVzZWQgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYmFjayBpbnRvIHRoZSB0cmFja2luZ1xuICogc3lzdGVtIGFzeW5jaHJvbm91c2x5LlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIFNlbmRzIGEgcmVxdWVzdCB0byB0aGUgZGF0YSBzdG9yZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGluaXRpYXRlIGEgcmVxdWVzdCwgdGhlbiBjYWxsIHJlc29sdmVyLnJlc29sdmUoZGF0YSlcbiAgICogd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAqIFxuICAgKiBUaGUgZGF0YSBvYmplY3QgcGFzc2VkIHRvIHJlc29sdmUoKSBtYXkgY29udGFpbiBvbmUgb3IgbW9yZSBvZjogJ2NvbnRleHQnLFxuICAgKiAnd2lkZ2V0JywgJ2VkaXRCdWZmZXJJdGVtJywgJ3NjaGVtYScuIEVhY2ggZW50cnkgc2hvdWxkIGJlIGEgZGF0YSBtb2RlbFxuICAgKiBrZXllZCBieSB0aGUgaWQgb2YgdGhlIGRhdGEgbW9kZWwuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgVGhlIHJlcXVlc3QgdHlwZS4gVGhpcyBjYW4gYmUgb25lIG9mOiAnSU5TRVJUX0lURU0nLCAnUkVOREVSX0lURU0nLFxuICAgKiAgICdEVVBMSUNBVEVfSVRFTScsICdGRVRDSF9TQ0hFTUEnLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YVxuICAgKiAgIFRoZSBkYXRhIHRvIGJlIHNlbnQgaW4gdGhlIHJlcXVlc3QuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5nc1xuICAgKiAgIE5vbi1jb21tYW5kIHNwZWNpZmljIGNvbnRleHQgc2V0dGluZ3MuXG4gICAqIEBwYXJhbSB7U3luY0FjdGlvblJlc29sdmVyfSByZXNvbHZlclxuICAgKiAgIFRoZSByZXNvbHZlciBzZXJ2aWNlIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHJlc29sdmUgdGhlIGNvbW1hbmQuXG4gICAqL1xuICBzZW5kOiBmdW5jdGlvbih0eXBlLCBkYXRhLCBzZXR0aW5ncywgcmVzb2x2ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuaW1wbGVtZW50ZWQgbWV0aG9kLicpO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cy5leHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbi8qKlxuICogQSBjZW50cmFsIGRpc3BhdGNoZXIgZm9yIHNlbmRpbmcgY29tbWFuZHMgdG8gdGhlIGNhbm9uaWNhbCBkYXRhIHN0b3JlLlxuICpcbiAqIERlZmF1bHQgU3VwcG9ydGVkIEFjdGlvbnM6XG4gKlxuICogICBJTlNFUlRfSVRFTTogUmVxdWVzdHMgYSBuZXcgZWRpdCBidWZmZXIgaXRlbSBmcm9tIHRoZSBkYXRhIHN0b3JlLiBUaGlzXG4gKiAgIHRyaWdnZXJzIHRoZSBjcmVhdGlvbiBvZiBhbiBlZGl0IGJ1ZmZlciBpdGVtIG9uIHRoZSBzZXJ2ZXIsIGFuZCBzaG91bGRcbiAqICAgcmVzb2x2ZSB3aXRoIHRoZSBuZXcgaXRlbS5cbiAqXG4gKiAgIEVESVRfSVRFTTogUmVxdWVzdHMgdGhhdCBhbiBleGlzdGluZyBlZGl0IGJ1ZmZlciBpdGVtIGJlIGVkaXRlZC4gVGhpc1xuICogICB0cmlnZ2VycyBhbiBlZGl0IGZsb3cgb24gdGhlIHNlcnZlci4gVGhlIGFjdHVhbCBkZXRhaWxzIG9mIHRoYXQgZmxvdyBhcmVcbiAqICAgbm90IGVuZm9yY2VkLiBGb3IgZXhhbXBsZSwgdGhlIHNlcnZlciBtYXkgZGVsaXZlciBiYWNrIGFuIGFqYXggZm9ybSBmb3IgdGhlXG4gKiAgIGVkaXQgYnVmZmVyIGl0ZW0gYW5kIHJlc29sdmUgdGhlIGFjdGlvbiBvbmNlIHRoYXQgZm9ybSBpcyBzdWJtaXR0ZWQuIFRoZVxuICogICByZXNvbHV0aW9uIHNob3VsZCBpbmNsdWRlIHRoZSB1cGRhdGVzIG1hZGUgdG8gdGhlIGVkaXQgYnVmZmVyIGl0ZW0gbW9kZWwuXG4gKlxuICogICBSRU5ERVJfSVRFTTogUmVxdWVzdHMgdGhlIHJlcHJlc2VudGF0aW9uYWwgbWFya3VwIGZvciBhIGRhdGEgZW50aXR5IHRoYXRcbiAqICAgd2lsbCBiZSByZW5kZXJlZCBpbiB0aGUgZWRpdG9yIHZpZXdtb2RlLiBUaGUgY29tbWFuZCBzaG91bGQgcmVzb2x2ZSB3aXRoXG4gKiAgIHRoZSBlZGl0IGJ1ZmZlciBpdGVtIG1vZGVsIGNvbnRhaW5pbmcgdGhlIHVwZGF0ZWQgbWFya3VwLiBUaGlzIG1hcmt1cCB3aWxsXG4gKiAgIGF1dG9tYXRpY2FsbHkgYmUgc3luY2VkIHRvIHRoZSB3aWRnZXQuIFRoZSBtYXJrdXAgY2FuIGFsc28gY29udGFpbiBpbmxpbmVcbiAqICAgZWRpdGFibGUgZmllbGRzIGluIHRoZSBmb3JtYXQgc3BlY2lmaWVkIGJ5IHRoZSBzeW5jIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogICBEVVBMSUNBVEVfSVRFTTogUmVxdWVzdHMgdGhhdCBhbiBpdGVtIGJlIGR1cGxpY2F0ZWQgaW4gdGhlIHN0b3JlLCByZXN1bHRpbmdcbiAqICAgaW4gYSBuZXdseSBjcmVhdGVkIGl0ZW0uIFRoaXMgY29tbWFuZCBzaG91bGQgcmVzb2x2ZSB3aXRoIHRoZSBuZXdseSBjcmVhdGVkXG4gKiAgIGVkaXQgYnVmZmVyIG1vZGVsLlxuICpcbiAqICAgRkVUQ0hfU0NIRU1BOiBSZXF1ZXN0cyB0aGUgc2NoZW1hIGZvciBhIGZpZWxkIGZyb20gdGhlIHNlcnZlci4gVGhpcyBzaG91bGRcbiAqICAgcmVzb2x2ZSB3aXRoIGEgc2NoZW1hIG1vZGVsIGRldGFpbGluZyB3aGljaCBvdGhlciB0eXBlcyBvZiBmaWVsZHMgY2FuIGJlXG4gKiAgIG5lc3RlZCBpbnNpZGUgdGhlIGdpdmVuIGZpZWxkIHR5cGUuXG4gKlxuICogQHBhcmFtIHtTeW5jUHJvdG9jb2x9IHByb3RvY29sXG4gKiAgIEEgcHJvdG9jb2wgcGx1Z2luIGZvciBoYW5kbGluZyB0aGUgcmVxdWVzdCAvIHJlc3BvbnNlIHRyYW5zYWN0aW9uLlxuICogQHBhcmFtIHtTeW5jQWN0aW9uUmVzb2x2ZXJ9IHJlc29sdmVyXG4gKiAgIFRoZSByZXNvbHZlciBzZXJ2aWNlIGZvciBwcm9jZXNzaW5nIHN5bmMgYWN0aW9uIHJlc3BvbnNlcy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwcm90b2NvbCwgcmVzb2x2ZXIpIHtcbiAgdGhpcy5fcHJvdG9jb2wgPSBwcm90b2NvbDtcbiAgdGhpcy5fcmVzb2x2ZXIgPSByZXNvbHZlcjtcbn07XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBEaXNwYXRjaGVzIGEgc3luYyBhY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAqICAgU2hvdWxkIGJlIG9uZSBvZjogJ0lOU0VSVF9JVEVNJywgJ0VESVRfSVRFTScsICdSRU5ERVJfSVRFTScsXG4gICAqICAgJ0RVUExJQ0FURV9JVEVNJywgJ0ZFVENIX1NDSEVNQScuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhXG4gICAqICAgQXJiaXRyYXJ5IGRhdGEgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0LlxuICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3NcbiAgICogICBDb250ZXh0LXNwZWNpZmljIHNldHRpbmdzIHRvIGJlIHNlbnQgd2l0aCB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGRpc3BhdGNoOiBmdW5jdGlvbih0eXBlLCBkYXRhLCBzZXR0aW5ncykge1xuICAgIHRoaXMuX3Byb3RvY29sLnNlbmQodHlwZSwgZGF0YSwgc2V0dGluZ3MsIHRoaXMuX3Jlc29sdmVyKTtcbiAgfVxuXG59KTtcbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLyoqXG4gKiBBIGNsYXNzIGZvciByZXNvbHZpbmcgZGlzcGF0Y2hlZCBhY3Rpb25zLlxuICpcbiAqIERpc3BhdGNoZWQgYWN0aW9ucyBhcmUgcmVzb2x2ZWQgYnkgY2hlY2tpbmcgdGhlIHJlc3BvbnNlIGZvciBtb2RlbHMgdGhhdFxuICogc2hvdWxkIGJlIGFkZGVkIHRvIHRoZSBhcHByb3ByaWF0ZSBjb2xsZWN0aW9uLlxuICpcbiAqIFRoZSByZXNvbHZlciBzZXJ2aWNlIGlzIHNldCB1cCB3aXRoIGEgbWFwcGluZ3Mgb2YgbW9kZWxzLXRvLWNvbGxlY3Rpb25zIGFuZFxuICogdXNlcyB0aGlzIG1hcHBpbmcgdG8gdXBkYXRlIHRoZSBhc3NvY2lhdGVkIGNvbGxlY3Rpb24gd2hlbiBpdCBzZWVzIGEgbW9kZWxcbiAqIHRoYXQgaGFzIGJlZW4gbWFwcGVkLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jb2xsZWN0aW9ucyA9IHt9O1xufTtcblxuXy5leHRlbmQobW9kdWxlLmV4cG9ydHMucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBtb2RlbC10by1jb2xsZWN0aW9uIG1hcC5cbiAgICpcbiAgICogVGhpcyBtYXAgaXMgdXNlZCB0byBhZGQgbW9kZWxzIGluIHRoZSByZXNwb25zZSB0byB0aGUgYXBwcm9wcmlhdGVcbiAgICogY29sbGVjaXRvbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGVsTmFtZVxuICAgKiAgIFRoZSBrZXkgaW4gdGhlIHJlc3BvbnNlIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgbW9kZWwgdG8gYmUgYWRkZWQgdG8gdGhlXG4gICAqICAgc3BlY2lmaWVkIGNvbGxlY3Rpb24uXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGNvbGxlY3Rpb25DYWxsYmFja1xuICAgKiAgIElmIHRoZSBwYXNzZWQgdmFsdWUgaXMgYSBCYWNrYm9uZS5Db2xsZWN0aW9uLCBtb2RlbHMgaW4gdGhlIHJlc3BvbnNlIHdpbGxcbiAgICogICBiZSBhZGRlZCBkaXJlY3RseSB0byB0aGlzIGNvbGxlY3Rpb24uIElmIHRoZSBwYXNzZWQgdmFsdWUgaXMgYSBmdW5jdGlvbixcbiAgICogICB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgbW9kZWwgYXR0cmlidXRlcyBpbiB0aGVcbiAgICogICByZXNwb25zZSBhbmQgc2hvdWxkIHJldHVybiB0aGUgcmVzb2x2ZWQgY29sbGVjdGlvbi4gVGhlIG1vZGVsIHdpbGwgYmVcbiAgICogICBhZGRlZCB0byB0aGUgcmVzb2x2ZWQgY29sbGVjdGlvbiBpbiB0aGlzIGNhc2UuXG4gICAqL1xuICBhZGRDb2xsZWN0aW9uOiBmdW5jdGlvbihtb2RlbE5hbWUsIGNvbGxlY3Rpb25DYWxsYmFjaykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb25zW21vZGVsTmFtZV0gPSBjb2xsZWN0aW9uQ2FsbGJhY2s7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlc29sdmVzIGEgZGlzcGF0Y2hlZCBzeW5jIGFjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlXG4gICAqICAgQSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZSBhY3Rpb24gcmVzcG9uc2UuIEtleXMgaW4gdGhpc1xuICAgKiAgIG9iamVjdCBzaG91bGQgYmUgbW9kZWwgbmFtZXMgYXMgcGFzc2VkIHRvIHRoZSBhZGRDb2xsZWN0aW9uIG1ldGhvZC4gVGhlXG4gICAqICAgdmFsdWVzIGluIHRoaXMgb2JqZWN0IHNob3VsZCBiZSBtb2RlbHMgdG8gYmUgYWRkZWQgdG8gdGhlIGFzc29jaWF0ZWRcbiAgICogICBjb2xsZWN0aW9uLiBFYWNoIGVudHJ5IGluIHRoZSBvYmplY3Qgc2hvdWxkIGNvbnRhaW4gYSBqYXZhc2NyaXB0IG9iamVjdCxcbiAgICogICBrZXllZCBieSB0aGUgbW9kZWwncyBpZCwgYW5kIGNvbnRhaW5nIHRoZSBtb2RlbCBhdHRyaWJ1dGVzIHRvIGJlIHNldCBpblxuICAgKiAgIHRoZSBjb2xsZWN0aW9uIGFzIGEgdmFsdWUuXG4gICAqL1xuICByZXNvbHZlOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIF8uZWFjaChyZXNwb25zZSwgZnVuY3Rpb24obW9kZWxzLCBtb2RlbE5hbWUpIHtcbiAgICAgIGlmICh0aGlzLl9jb2xsZWN0aW9uc1ttb2RlbE5hbWVdKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZU1vZGVscyhtb2RlbHMsIHRoaXMuX2NvbGxlY3Rpb25zW21vZGVsTmFtZV0pO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGRzIG1vZGVscyB0byBhIGNvbGxlY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBtb2RlbHNcbiAgICogICBBbiBvYmplY3Qgd2hlcmUga2V5cyBhcmUgbW9kZWwgaWRzIGFuZCB2YWx1ZXMgYXJlIG1vZGVsIGF0dHJpYnV0ZXMuXG4gICAqIEBwYXJhbSB7bWl4ZWR9IGNvbGxlY3Rpb25cbiAgICogICBDYW4gZWl0aGVyIGJlIGEgQmFja2JvbmUuQ29sbGVjdGlvbiB0byBhZGQgdGhlIG1vZGVsIHRvLCBvciBhIGNhbGxiYWNrXG4gICAqICAgd2hpY2ggcmV0dXJucyB0aGUgY29sbGVjdGlvbi5cbiAgICovXG4gIF91cGRhdGVNb2RlbHM6IGZ1bmN0aW9uKG1vZGVscywgY29sbGVjdGlvbikge1xuICAgIHZhciByZXNvbHZlZENvbGxlY3Rpb24gPSBjb2xsZWN0aW9uO1xuICAgIF8uZWFjaChtb2RlbHMsIGZ1bmN0aW9uKGF0dHJpYnV0ZXMsIGlkKSB7XG5cbiAgICAgIC8vIElmIGEgZnVuY3Rpb24gaXMgcGFzc2VkIGFzIHRoZSBjb2xsZWN0aW9uLCB3ZSBjYWxsIGl0IHRvIHJlc29sdmUgdGhlXG4gICAgICAvLyBhY3R1YWwgY29sbGVjdGlvbiBmb3IgdGhpcyBtb2RlbC5cbiAgICAgIGlmICh0eXBlb2YgY29sbGVjdGlvbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJlc29sdmVkQ29sbGVjdGlvbiA9IGNvbGxlY3Rpb24oYXR0cmlidXRlcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIGZpcnN0IHRyeSB0byBsb2FkIHRoZSBleGlzdGluZyBtb2RlbCBpbnN0ZWFkIG9mIGRpcmVjdGx5IHNldHRpbmcgdGhlXG4gICAgICAvLyBtb2RlbCBpbiBjb2xsZWN0aW9uIHNpbmNlIGl0IGlzIGNvbXBsZXRlbHkgdmFsaWQgZm9yIGEgbW9kZWwncyBpZCB0b1xuICAgICAgLy8gY2hhbmdlLlxuICAgICAgdmFyIGV4aXN0aW5nID0gcmVzb2x2ZWRDb2xsZWN0aW9uLmdldChpZCk7XG4gICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgZXhpc3Rpbmcuc2V0KGF0dHJpYnV0ZXMpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJlc29sdmVkQ29sbGVjdGlvbi5hZGQoYXR0cmlidXRlcyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIG1hcmt1cCkge1xuICB2YXIgZGlzcGxheUVsZW1lbnQgPSBlbGVtZW50RmFjdG9yeS5jcmVhdGUoJ3dpZGdldC1kaXNwbGF5Jyk7XG4gIHZhciB0b29sYmFyRWxlbWVudCA9IGVsZW1lbnRGYWN0b3J5LmNyZWF0ZSgndG9vbGJhcicpO1xuICB2YXIgdG9vbGJhckl0ZW1FbGVtZW50ID0gZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd0b29sYmFyLWl0ZW0nKTtcbiAgdmFyIGNvbW1hbmRFbGVtZW50ID0gZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd3aWRnZXQtY29tbWFuZCcpO1xuXG4gIHJldHVybiBkaXNwbGF5RWxlbWVudC5yZW5kZXJPcGVuaW5nVGFnKClcbiAgICArIG1hcmt1cFxuICAgICsgdG9vbGJhckVsZW1lbnQucmVuZGVyT3BlbmluZ1RhZygpXG4gICAgICArIHRvb2xiYXJJdGVtRWxlbWVudC5yZW5kZXJPcGVuaW5nVGFnKClcbiAgICAgICAgKyBjb21tYW5kRWxlbWVudC5zZXRBdHRyaWJ1dGUoJzxjb21tYW5kPicsICdlZGl0JykucmVuZGVyT3BlbmluZ1RhZygpICsgY29tbWFuZEVsZW1lbnQucmVuZGVyQ2xvc2luZ1RhZygpXG4gICAgICArIHRvb2xiYXJJdGVtRWxlbWVudC5yZW5kZXJDbG9zaW5nVGFnKClcbiAgICAgICsgdG9vbGJhckl0ZW1FbGVtZW50LnJlbmRlck9wZW5pbmdUYWcoKVxuICAgICAgICArIGNvbW1hbmRFbGVtZW50LnNldEF0dHJpYnV0ZSgnPGNvbW1hbmQ+JywgJ2RlbGV0ZScpLnJlbmRlck9wZW5pbmdUYWcoKSArIGNvbW1hbmRFbGVtZW50LnJlbmRlckNsb3NpbmdUYWcoKVxuICAgICAgKyB0b29sYmFySXRlbUVsZW1lbnQucmVuZGVyQ2xvc2luZ1RhZygpXG4gICAgKyB0b29sYmFyRWxlbWVudC5yZW5kZXJDbG9zaW5nVGFnKClcbiAgKyBkaXNwbGF5RWxlbWVudC5yZW5kZXJDbG9zaW5nVGFnKCk7XG59O1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbGVtZW50RmFjdG9yeSwgZmllbGRzLCBlZGl0cykge1xuICB2YXIgcmVzdWx0ID0gJyc7XG5cbiAgaWYgKGZpZWxkcykge1xuICAgIF8uZWFjaChmaWVsZHMsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gZWxlbWVudEZhY3RvcnkuY3JlYXRlKG5vZGUudHlwZSwgbm9kZSk7XG4gICAgICB2YXIgZWRpdDsgXG5cbiAgICAgIGlmIChub2RlLnR5cGUgPT0gJ2ZpZWxkJykge1xuICAgICAgICBpZiAobm9kZS5jb250ZXh0KSB7XG4gICAgICAgICAgZWRpdCA9IGVkaXRzW25vZGUuY29udGV4dF07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJzxlZGl0YWJsZT4nLCAnZmFsc2UnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXN1bHQgKz0gZWxlbWVudC5yZW5kZXJPcGVuaW5nVGFnKCk7XG5cbiAgICAgIGlmIChlZGl0KSB7XG4gICAgICAgIHJlc3VsdCArPSBlZGl0O1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJlc3VsdCArPSBtb2R1bGUuZXhwb3J0cyhlbGVtZW50RmFjdG9yeSwgbm9kZS5jaGlsZHJlbiwgZWRpdHMpO1xuICAgICAgfVxuXG4gICAgICByZXN1bHQgKz0gZWxlbWVudC5yZW5kZXJDbG9zaW5nVGFnKCk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIEEgQmFja2JvbmUgdmlldyBmb3Igd3JhcHBpbmcgY29udGV4dCBjb250YWluaW5nIERPTSBub2Rlcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbi8qKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblxuICAvKipcbiAgICoge0Bpbmhlcml0ZG9jfVxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oYXR0cmlidXRlcywgb3B0aW9ucykge1xuICAgIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gb3B0aW9ucy5lbGVtZW50RmFjdG9yeTtcblxuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgJ2NoYW5nZTppZCcsIHRoaXMucmVuZGVyKTtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsICdkZXN0cm95JywgdGhpcy5zdG9wTGlzdGVuaW5nKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLl9lbGVtZW50RmFjdG9yeS5nZXRUZW1wbGF0ZSgnZmllbGQnKTtcbiAgICB0aGlzLiRlbC5hdHRyKHRlbXBsYXRlLmdldEF0dHJpYnV0ZU5hbWUoJzxjb250ZXh0PicpLCB0aGlzLm1vZGVsLmdldCgnY29udGV4dCcpKTtcbiAgfSxcblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIHZpZXcgZm9yIHJlcHJlc2VudGluZyB3aWRnZXRzIHdpdGhpbiB0aGUgZWRpdG9yLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKSxcbiAgJCA9IEJhY2tib25lLiQ7XG5cbi8qKlxuICogQmFja2JvbmUgdmlldyBmb3IgcmVwcmVzZW50aW5nIHdpZGdldHMgd2l0aGluIHRoZSBlZGl0b3IuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQGF1Z21lbnRzIEJhY2tib25lLk1vZGVsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG4gIC8qKlxuICAgKiB7QGluaGVyaXRkb2N9XG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy5hZGFwdGVyID0gb3B0aW9ucy5hZGFwdGVyO1xuICAgIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gb3B0aW9ucy5lbGVtZW50RmFjdG9yeTtcbiAgICB0aGlzLnRlbXBsYXRlID0gb3B0aW9ucy50ZW1wbGF0ZTtcblxuICAgIC8vIEdldCBhIGxpc3Qgb2YgdGVtcGxhdGVzIHRoYXQgd2lsbCBiZSB1c2VkLlxuICAgIHZhciB3aWRnZXRUZW1wbGF0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCd3aWRnZXQnKTtcbiAgICB2YXIgZmllbGRUZW1wbGF0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCdmaWVsZCcpO1xuICAgIHZhciB3aWRnZXRDb21tYW5kVGVtcGxhdGUgPSB0aGlzLl9lbGVtZW50RmFjdG9yeS5nZXRUZW1wbGF0ZSgnd2lkZ2V0LWNvbW1hbmQnKTtcblxuICAgIC8vIFNldCB1cCBhdHRyaWJ1dGUgLyBlbGVtZW50IHNlbGVjdG9ycy5cbiAgICB0aGlzLndpZGdldFNlbGVjdG9yID0gd2lkZ2V0VGVtcGxhdGUuZ2V0U2VsZWN0b3IoKTtcbiAgICB0aGlzLnZpZXdNb2RlQXR0cmlidXRlID0gd2lkZ2V0VGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZSgnPHZpZXdtb2RlPicpO1xuICAgIHRoaXMuaW5saW5lQ29udGV4dEF0dHJpYnV0ZSA9IGZpZWxkVGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZSgnPGNvbnRleHQ+Jyk7XG4gICAgdGhpcy5jb21tYW5kU2VsZWN0b3IgPSB3aWRnZXRDb21tYW5kVGVtcGxhdGUuZ2V0U2VsZWN0b3IoKTtcbiAgICB0aGlzLmNvbW1hbmRBdHRyaWJ1dGUgPSB3aWRnZXRDb21tYW5kVGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZSgnPGNvbW1hbmQ+Jyk7XG4gICAgdGhpcy5pbmxpbmVFZGl0b3JTZWxlY3RvciA9IGZpZWxkVGVtcGxhdGUuZ2V0U2VsZWN0b3IoKTtcblxuICAgIC8vIFNldCB1cCB0aGUgY2hhbmdlIGhhbmRsZXIuXG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCAnY2hhbmdlJywgdGhpcy5fY2hhbmdlSGFuZGxlcik7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIG1hcmt1cCkge1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5tb2RlbC5nZXQoJ2R1cGxpY2F0aW5nJykpIHtcbiAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSh0aGlzLl9lbGVtZW50RmFjdG9yeSwgJy4uLicpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgdmlldyA9IHRoaXM7XG4gICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5fZWxlbWVudEZhY3RvcnksIHRoaXMubW9kZWwuZ2V0KCdtYXJrdXAnKSkpO1xuXG4gICAgICB0aGlzLiRlbC5maW5kKHRoaXMuY29tbWFuZFNlbGVjdG9yKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbW1hbmQgPSAkKHRoaXMpLmF0dHIodmlldy5jb21tYW5kQXR0cmlidXRlKTtcblxuICAgICAgICBpZiAoY29tbWFuZCA9PSAnZWRpdCcpIHtcbiAgICAgICAgICB2aWV3LnNhdmUoKS5lZGl0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY29tbWFuZCA9PSAncmVtb3ZlJykge1xuICAgICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnJlbmRlckF0dHJpYnV0ZXMoKTtcbiAgICAgIHRoaXMucmVuZGVyRWRpdHMoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHJlbmRlckF0dHJpYnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuY3JlYXRlKCd3aWRnZXQnLCB7XG4gICAgICBjb250ZXh0OiB0aGlzLm1vZGVsLmdldCgnY29udGV4dElkJyksXG4gICAgICB1dWlkOiB0aGlzLm1vZGVsLmdldCgnaXRlbUlkJyksXG4gICAgICB2aWV3bW9kZTogJ2VkaXRvcicsXG4gICAgfSk7XG5cbiAgICBfLmVhY2goZWxlbWVudC5nZXRBdHRyaWJ1dGVzKCksIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICB0aGlzLiRlbC5hdHRyKG5hbWUsIHZhbHVlKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgcmVuZGVyRWRpdHM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlZGl0cyA9IHRoaXMubW9kZWwuZ2V0KCdlZGl0cycpO1xuICAgIHRoaXMuX2lubGluZUVsZW1lbnRWaXNpdG9yKGZ1bmN0aW9uKCRlbCwgY29udGV4dFN0cmluZywgc2VsZWN0b3IpIHtcbiAgICAgIC8vIEZldGNoIHRoZSBlZGl0IGFuZCBzZXQgYSBkYXRhIGF0dHJpYnV0ZSB0byBtYWtlIGFzc29jaWF0aW5nIGVkaXRzXG4gICAgICAvLyBlYXNpZXIgZm9yIHdob2V2ZXIgaXMgZ29pbmcgdG8gYXR0YWNoIHRoZSBpbmxpbmUgZWRpdG9yLlxuICAgICAgJGVsLmh0bWwoZWRpdHNbY29udGV4dFN0cmluZ10gPyBlZGl0c1tjb250ZXh0U3RyaW5nXSA6ICcnKTtcblxuICAgICAgLy8gVGVsbCB0aGUgd2lkZ2V0IG1hbmFnZXIgdG8gZW5hYmxlIGlubGluZSBlZGl0aW5nIGZvciB0aGlzIGVsZW1lbnQuXG4gICAgICB0aGlzLmFkYXB0ZXIuYXR0YWNoSW5saW5lRWRpdGluZyh0aGlzLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBzYXZlOiBmdW5jdGlvbigpIHtcblxuICAgIGlmICghdGhpcy5tb2RlbC5nZXQoJ2R1cGxpY2F0aW5nJykpIHtcbiAgICAgIHZhciBlZGl0cyA9IHt9O1xuICAgICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcikge1xuICAgICAgICBlZGl0c1tjb250ZXh0U3RyaW5nXSA9IHRoaXMuYWRhcHRlci5nZXRJbmxpbmVFZGl0KHRoaXMsIGNvbnRleHRTdHJpbmcsIHNlbGVjdG9yKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5tb2RlbC5zZXQoe2VkaXRzOiBlZGl0c30sIHtzaWxlbnQ6IHRydWV9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHJlYmFzZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9sZEVkaXRzID0gXy5wYWlycyh0aGlzLm1vZGVsLmdldCgnZWRpdHMnKSk7XG4gICAgdmFyIGVkaXRzID0ge307XG4gICAgdGhpcy5faW5saW5lRWxlbWVudFZpc2l0b3IoZnVuY3Rpb24oJGVsLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcikge1xuICAgICAgdmFyIG5leHQgPSBvbGRFZGl0cy5zaGlmdCgpO1xuICAgICAgZWRpdHNbY29udGV4dFN0cmluZ10gPSBuZXh0ID8gbmV4dFsxXSA6ICcnO1xuICAgIH0pO1xuICAgIHRoaXMubW9kZWwuc2V0KHtlZGl0czogZWRpdHN9KTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZWRpdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb2RlbC5lZGl0KCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIGlmICh0aGlzLm1vZGVsKSB7XG4gICAgICB2YXIgbW9kZWwgPSB0aGlzLm1vZGVsO1xuICAgICAgdGhpcy5tb2RlbCA9IG51bGw7XG4gICAgICBtb2RlbC5kZXN0cm95KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kZWwuZmluZCh0aGlzLmNvbW1hbmRTZWxlY3Rvcikub2ZmKCk7XG4gICAgcmV0dXJuIEJhY2tib25lLlZpZXcucHJvdG90eXBlLnN0b3BMaXN0ZW5pbmcuY2FsbCh0aGlzKTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGlzRWRpdG9yVmlld1JlbmRlcmVkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy4kZWwuYXR0cih0aGlzLnZpZXdNb2RlQXR0cmlidXRlKSA9PSAnZWRpdG9yJztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIF9jaGFuZ2VIYW5kbGVyOiBmdW5jdGlvbigpIHtcbiAgICAvLyBJZiB0aGUgd2lkZ2V0IGlzIGN1cnJlbnRseSBhc2tpbmcgZm9yIGEgZHVwbGljYXRlIGJ1ZmZlciBpdGVtIGZyb20gdGhlXG4gICAgLy8gc2VydmVyLCBvciBzdWNoIGEgcmVxdWVzdCBqdXN0IGZpbmlzaGVkLCB3ZSBkb24ndCB3YW50IHRvIHNhdmUgdGhlXG4gICAgLy8gY3VycmVudCBzdGF0ZSBvZiB0aGUgZWRpdG9yIHNpbmNlIGl0IGlzIGp1c3QgZGlzcGxheWluZyBhICdsb2FkaW5nJ1xuICAgIC8vIG1lc3NhZ2UuXG4gICAgaWYgKHRoaXMubW9kZWwucHJldmlvdXMoJ2R1cGxpY2F0aW5nJykpIHtcbiAgICAgIHRoaXMucmVuZGVyKCkucmViYXNlKCk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIG1hcmt1cCBjaGFuZ2VkIGFuZCB0aGUgd2lkZ2V0IHdhc24ndCBkdXBsaWNhdGluZywgd2UgaGF2ZSB0b1xuICAgIC8vIHJlLXJlbmRlciBldmVyeXRoaW5nLlxuICAgIGVsc2UgaWYgKHRoaXMubW9kZWwuZ2V0KCdkdXBsaWNhdGluZycpIHx8IHRoaXMubW9kZWwuaGFzQ2hhbmdlZCgnbWFya3VwJykpIHtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIHdlIGNhbiBqdXN0IHJlLXJlbmRlciB0aGUgcGFydHMgdGhhdCBjaGFuZ2VkLlxuICAgIGVsc2Uge1xuICAgICAgaWYgKHRoaXMubW9kZWwuaGFzQ2hhbmdlZCgnZWRpdHMnKSkge1xuICAgICAgICB0aGlzLnJlbmRlckVkaXRzKCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm1vZGVsLmhhc0NoYW5nZWQoJ2l0ZW1JZCcpIHx8IHRoaXMubW9kZWwuaGFzQ2hhbmdlZCgnaXRlbUNvbnRleHRJZCcpKSB7XG4gICAgICAgIHRoaXMucmVuZGVyQXR0cmlidXRlcygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgX2lubGluZUVsZW1lbnRWaXNpdG9yKGNhbGxiYWNrKSB7XG4gICAgdmFyIHZpZXcgPSB0aGlzO1xuICAgIHRoaXMuJGVsLmZpbmQodGhpcy5pbmxpbmVFZGl0b3JTZWxlY3RvcikuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkKHRoaXMpLmNsb3Nlc3Qodmlldy53aWRnZXRTZWxlY3RvcikuaXModmlldy4kZWwpKSB7XG4gICAgICAgIHZhciBjb250ZXh0U3RyaW5nID0gJCh0aGlzKS5hdHRyKHZpZXcuaW5saW5lQ29udGV4dEF0dHJpYnV0ZSk7XG4gICAgICAgIHZhciBzZWxlY3RvciA9IHZpZXcuaW5saW5lRWRpdG9yU2VsZWN0b3IgKyAnWycgKyB2aWV3LmlubGluZUNvbnRleHRBdHRyaWJ1dGUgKyAnPVwiJyArIGNvbnRleHRTdHJpbmcgKyAnXCJdJztcbiAgICAgICAgY2FsbGJhY2suY2FsbCh2aWV3LCAkKHRoaXMpLCBjb250ZXh0U3RyaW5nLCBzZWxlY3Rvcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxufSk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIEJhY2tib25lIHZpZXcgZm9yIHJlcHJlc2VudGluZyB0aGUgZXhwb3J0ZWQgZGF0YSBzdGF0ZSBvZiBhIHdpZGdldC5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpLFxuICBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyksXG4gICQgPSBCYWNrYm9uZS4kO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLmFkYXB0ZXIgPSBvcHRpb25zLmFkYXB0ZXI7XG4gICAgdGhpcy5lbGVtZW50RmFjdG9yeSA9IG9wdGlvbnMuZWxlbWVudEZhY3Rvcnk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IG9wdGlvbnMudGVtcGxhdGU7XG5cbiAgICAvLyBHZXQgYSBsaXN0IG9mIHRlbXBsYXRlcyB0aGF0IHdpbGwgYmUgdXNlZC5cbiAgICB2YXIgd2lkZ2V0VGVtcGxhdGUgPSB0aGlzLmVsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCd3aWRnZXQnKTtcbiAgICB2YXIgZmllbGRUZW1wbGF0ZSA9IHRoaXMuZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ2ZpZWxkJyk7XG5cbiAgICAvLyBTZXQgdXAgYXR0cmlidXRlIC8gZWxlbWVudCBzZWxlY3RvcnMuXG4gICAgdGhpcy5pbmxpbmVDb250ZXh0QXR0cmlidXRlID0gZmllbGRUZW1wbGF0ZS5nZXRBdHRyaWJ1dGVOYW1lKCc8Y29udGV4dD4nKTtcbiAgICB0aGlzLmlubGluZUVkaXRvclNlbGVjdG9yID0gZmllbGRUZW1wbGF0ZS5nZXRTZWxlY3RvcigpO1xuXG4gICAgLy8gRmlsdGVyIG91dCBub24tY29uZmlndXJlZCBhdHRyaWJ1dGVzLlxuICAgIHRoaXMuYXR0cmlidXRlV2hpdGVsaXN0ID0gXy5pbnZlcnQod2lkZ2V0VGVtcGxhdGUuZ2V0QXR0cmlidXRlTmFtZXMoKSk7XG4gICAgZGVsZXRlIHRoaXMuYXR0cmlidXRlV2hpdGVsaXN0W3dpZGdldFRlbXBsYXRlLmdldEF0dHJpYnV0ZU5hbWUoJzx2aWV3bW9kZT4nKV07XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24oZWxlbWVudEZhY3RvcnksIGZpZWxkcywgZWRpdHMpIHtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpZXcgPSB0aGlzO1xuICAgIHZhciBmaWVsZHMgPSB0aGlzLm1vZGVsLmVkaXRCdWZmZXJJdGVtUmVmLmVkaXRCdWZmZXJJdGVtLmdldCgnZmllbGRzJyk7XG4gICAgdmFyIGVkaXRzID0gdGhpcy5tb2RlbC5nZXQoJ2VkaXRzJyk7XG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMuZWxlbWVudEZhY3RvcnksIGZpZWxkcywgZWRpdHMpKTtcbiAgICBfLmVhY2godGhpcy5lbC5hdHRyaWJ1dGVzLCBmdW5jdGlvbihhdHRyKSB7XG4gICAgICBpZiAoXy5pc1VuZGVmaW5lZCh2aWV3LmF0dHJpYnV0ZVdoaXRlbGlzdFthdHRyLm5hbWVdKSkge1xuICAgICAgICB2aWV3LiRlbC5yZW1vdmVBdHRyKGF0dHIubmFtZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBzYXZlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWRpdHMgPSB7fTtcbiAgICB2YXIgdmlldyA9IHRoaXM7XG4gICAgdGhpcy4kZWwuZmluZCh0aGlzLmlubGluZUVkaXRvclNlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNvbnRleHRTdHJpbmcgPSAkKHRoaXMpLmF0dHIodmlldy5pbmxpbmVDb250ZXh0QXR0cmlidXRlKTtcbiAgICAgIGVkaXRzW2NvbnRleHRTdHJpbmddID0gJCh0aGlzKS5odG1sKCk7XG4gICAgfSk7XG4gICAgdGhpcy5tb2RlbC5zZXQoe2VkaXRzOiBlZGl0c30sIHtzaWxlbnQ6IHRydWV9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICovXG4gIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gIH1cblxufSk7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgbmFtZTogJ2RlZmF1bHQnLFxuXG4gIHNlcnZpY2VQcm90b3R5cGVzOiB7XG4gICAgJ0JpbmRlcic6IHJlcXVpcmUoJy4vQmluZGVyJyksXG4gICAgJ0NvbW1hbmRFbWl0dGVyJzogcmVxdWlyZSgnLi9FZGl0b3IvQ29tbWFuZC9Db21tYW5kRW1pdHRlcicpLFxuICAgICdDb250ZXh0Q29sbGVjdGlvbic6IHJlcXVpcmUoJy4vQ29sbGVjdGlvbnMvQ29udGV4dENvbGxlY3Rpb24nKSxcbiAgICAnQ29udGV4dExpc3RlbmVyJzogcmVxdWlyZSgnLi9Db250ZXh0L0NvbnRleHRMaXN0ZW5lcicpLFxuICAgICdDb250ZXh0UmVzb2x2ZXInOiByZXF1aXJlKCcuL0NvbnRleHQvQ29udGV4dFJlc29sdmVyJyksXG4gICAgJ0VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeSc6IHJlcXVpcmUoJy4vRWRpdEJ1ZmZlci9FZGl0QnVmZmVySXRlbVJlZkZhY3RvcnknKSxcbiAgICAnRWRpdEJ1ZmZlck1lZGlhdG9yJzogcmVxdWlyZSgnLi9FZGl0QnVmZmVyL0VkaXRCdWZmZXJNZWRpYXRvcicpLFxuICAgICdFZGl0b3JDb2xsZWN0aW9uJzogcmVxdWlyZSgnLi9Db2xsZWN0aW9ucy9FZGl0b3JDb2xsZWN0aW9uJyksXG4gICAgJ0VsZW1lbnRGYWN0b3J5JzogcmVxdWlyZSgnLi9FbGVtZW50L0VsZW1lbnRGYWN0b3J5JyksXG4gICAgJ1NjaGVtYUNvbGxlY3Rpb24nOiByZXF1aXJlKCcuL0NvbGxlY3Rpb25zL1NjaGVtYUNvbGxlY3Rpb24nKSxcbiAgICAnU3luY0FjdGlvbkRpc3BhdGNoZXInOiByZXF1aXJlKCcuL1N5bmNBY3Rpb24vU3luY0FjdGlvbkRpc3BhdGNoZXInKSxcbiAgICAnU3luY0FjdGlvblJlc29sdmVyJzogcmVxdWlyZSgnLi9TeW5jQWN0aW9uL1N5bmNBY3Rpb25SZXNvbHZlcicpLFxuICAgICdXaWRnZXRGYWN0b3J5JzogcmVxdWlyZSgnLi9FZGl0b3IvV2lkZ2V0L1dpZGdldEZhY3RvcnknKSxcbiAgICAnV2lkZ2V0U3RvcmUnOiByZXF1aXJlKCcuL0VkaXRvci9XaWRnZXQvV2lkZ2V0U3RvcmUnKSxcbiAgICAnV2lkZ2V0Vmlld0ZhY3RvcnknOiByZXF1aXJlKCcuL0VkaXRvci9XaWRnZXQvV2lkZ2V0Vmlld0ZhY3RvcnknKSxcbiAgICAnRWRpdG9yVmlldyc6IHJlcXVpcmUoJy4vVmlld3MvRWRpdG9yVmlldycpLFxuICB9LFxuXG4gIHZpZXdzOiB7XG4gICAgJ2VkaXRvcic6IHtcbiAgICAgIHByb3RvdHlwZTogcmVxdWlyZSgnLi9WaWV3cy9XaWRnZXRFZGl0b3JWaWV3JyksXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIHRlbXBsYXRlOiByZXF1aXJlKCcuL1RlbXBsYXRlcy9XaWRnZXRFZGl0b3JWaWV3VGVtcGxhdGUnKSxcbiAgICAgIH1cbiAgICB9LFxuICAgICdleHBvcnQnOiB7XG4gICAgICBwcm90b3R5cGU6IHJlcXVpcmUoJy4vVmlld3MvV2lkZ2V0TWVtZW50b1ZpZXcnKSxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vVGVtcGxhdGVzL1dpZGdldE1lbWVudG9WaWV3VGVtcGxhdGUnKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcblxuICBwbHVnaW5zOiB7XG4gICAgYWRhcHRlcjogbnVsbCxcbiAgICBwcm90b2NvbDogbnVsbCxcbiAgfSxcblxuICBlbGVtZW50czoge1xuICAgICd3aWRnZXQnOiB7XG4gICAgICB0YWc6ICdkaXYnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnZGF0YS11dWlkJzogJzx1dWlkPicsXG4gICAgICAgICdkYXRhLWNvbnRleHQtaGludCc6ICc8Y29udGV4dD4nLFxuICAgICAgICAnZGF0YS12aWV3bW9kZSc6ICc8dmlld21vZGU+JyxcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItd2lkZ2V0J1xuICAgICAgfVxuICAgIH0sXG4gICAgJ2ZpZWxkJzoge1xuICAgICAgdGFnOiAnZGl2JyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgJ2RhdGEtZmllbGQtbmFtZSc6ICc8ZmllbGQ+JyxcbiAgICAgICAgJ2RhdGEtY29udGV4dCc6ICc8Y29udGV4dD4nLFxuICAgICAgICAnZGF0YS1tdXRhYmxlJzogJzxlZGl0YWJsZT4nLFxuICAgICAgICAnY2xhc3MnOiAnd2lkZ2V0LWJpbmRlci1maWVsZCdcbiAgICAgIH1cbiAgICB9LFxuICAgICd3aWRnZXQtZGlzcGxheSc6IHtcbiAgICAgIHRhZzogJ2RpdicsXG4gICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICdjbGFzcyc6ICd3aWRnZXQtYmluZGVyLXdpZGdldF9fZGlzcGxheScsXG4gICAgICB9XG4gICAgfSxcbiAgICAndG9vbGJhcic6IHtcbiAgICAgIHRhZzogJ3VsJyxcbiAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgJ2NsYXNzJzogJ3dpZGdldC1iaW5kZXItdG9vbGJveCcsXG4gICAgICB9XG4gICAgfSxcbiAgICAndG9vbGJhci1pdGVtJzoge1xuICAgICAgdGFnOiAnbGknLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnY2xhc3MnOiAnd2lkZ2V0LWJpbmRlci10b29sYm94X19pdGVtJyxcbiAgICAgIH1cbiAgICB9LFxuICAgICd3aWRnZXQtY29tbWFuZCc6IHtcbiAgICAgIHRhZzogJ2EnLFxuICAgICAgYXR0cmlidXRlczoge1xuICAgICAgICAnY2xhc3MnOiAnd2lkZ2V0LWJpbmRlci1jb21tYW5kJyxcbiAgICAgICAgJ2RhdGEtY29tbWFuZCc6ICc8Y29tbWFuZD4nLFxuICAgICAgICAnaHJlZic6ICcjJyxcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZGF0YToge1xuICAgIGNvbnRleHQ6IHt9LFxuICAgIHNjaGVtYToge30sXG4gIH1cbn07XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBBIHBhY2thZ2UgZm9yIG1hbmFnaW5nIHNlcnZlciAvIGNsaWVudCBkYXRhIGJpbmRpbmcgZm9yIGVkaXRvciB3aWRnZXRzLiBcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG4vKipcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgaWYgKCFjb25maWcpIHtcbiAgICBjb25maWcgPSB7fTtcbiAgfVxuICB0aGlzLl9pbml0aWFsaXplKGNvbmZpZyk7XG59O1xuXG5fLmV4dGVuZChtb2R1bGUuZXhwb3J0cywge1xuICBkZWZhdWx0czogcmVxdWlyZSgnLi9jb25maWcnKSxcbiAgUGx1Z2luSW50ZXJmYWNlOiB7XG4gICAgRWRpdG9yQWRhcHRlcjogcmVxdWlyZSgnLi9QbHVnaW5zL0VkaXRvckFkYXB0ZXInKSxcbiAgICBTeW5jUHJvdG9jb2w6IHJlcXVpcmUoJy4vUGx1Z2lucy9TeW5jUHJvdG9jb2wnKSxcbiAgfVxufSk7XG5cbl8uZXh0ZW5kKG1vZHVsZS5leHBvcnRzLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKi9cbiAgZ2V0SW5zdGFuY2VOYW1lOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fZ2xvYmFsU2V0dGluZ3MubmFtZTtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldEVsZW1lbnRGYWN0b3J5OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fZWxlbWVudEZhY3Rvcnk7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRWaWV3RmFjdG9yeTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZpZXdGYWN0b3J5O1xuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgZ2V0Q29udGV4dHM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbjtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldFNjaGVtYTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NjaGVtYUNvbGxlY3Rpb247XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRFZGl0b3JzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fZWRpdG9yQ29sbGVjdGlvbjtcbiAgfSxcblxuICAvKipcbiAgICovXG4gIGdldFN5bmNBY3Rpb25EaXNwYXRjaGVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3luY0FjdGlvbkRpc3BhdGNoZXI7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBnZXRTeW5jQWN0aW9uUmVzb2x2ZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zeW5jQWN0aW9uUmVzb2x2ZXI7XG4gIH0sXG5cbiAgLyoqXG4gICAqL1xuICBvcGVuOiBmdW5jdGlvbigkZWRpdG9yRWwpIHtcbiAgICB2YXIgZWRpdG9yQ29udGV4dCA9IHRoaXMuX2NyZWF0ZUNvbnRleHRSZXNvbHZlcigpLnJlc29sdmVUYXJnZXRDb250ZXh0KCRlZGl0b3JFbCk7XG4gICAgdmFyIGVkaXRvckNvbnRleHRJZCA9IGVkaXRvckNvbnRleHQgPyBlZGl0b3JDb250ZXh0LmdldCgnaWQnKSA6IG51bGw7XG4gICAgdmFyIGVkaXRvck1vZGVsO1xuICAgIGlmIChlZGl0b3JDb250ZXh0SWQpIHtcbiAgICAgIGlmICghdGhpcy5fZWRpdG9yQ29sbGVjdGlvbi5nZXQoZWRpdG9yQ29udGV4dElkKSkge1xuICAgICAgICB2YXIgY29udGV4dFJlc29sdmVyID0gdGhpcy5fY3JlYXRlQ29udGV4dFJlc29sdmVyKGVkaXRvckNvbnRleHQpO1xuICAgICAgICB2YXIgY29tbWFuZEVtaXR0ZXIgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdDb21tYW5kRW1pdHRlcicsIHRoaXMuX3N5bmNBY3Rpb25EaXNwYXRjaGVyLCBlZGl0b3JDb250ZXh0KTtcbiAgICAgICAgdmFyIGVkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeSA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ0VkaXRCdWZmZXJJdGVtUmVmRmFjdG9yeScsIGNvbnRleHRSZXNvbHZlciwgY29tbWFuZEVtaXR0ZXIpO1xuXG4gICAgICAgIC8vIFNldHVwIGEgY29udGV4dCBsaXN0ZW5lciBmb3IgcmVjaWV2aW5nIGJ1ZmZlciBpdGVtIGFycml2YWxcbiAgICAgICAgLy8gbm90aWZpY2F0aW9ucywgYW5kIGEgY29udGV4dCByZXNvbHZlciBmb3IgZGV0ZXJtaW5pbmcgd2hpY2hcbiAgICAgICAgLy8gY29udGV4dChzKSBhbiBlbGVtZW50IGlzIGFzc29jaWF0ZWQgd2l0aC5cbiAgICAgICAgdmFyIGNvbnRleHRMaXN0ZW5lciA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ0NvbnRleHRMaXN0ZW5lcicpO1xuICAgICAgICBjb250ZXh0TGlzdGVuZXIuYWRkQ29udGV4dChlZGl0b3JDb250ZXh0KTtcblxuICAgICAgICAvLyBDcmVhdGUgZmFjdG9yaWVzIGZvciBnZW5lcmF0aW5nIG1vZGVscyBhbmQgdmlld3MuXG4gICAgICAgIHZhciBhZGFwdGVyID0gdGhpcy5fZ2xvYmFsU2V0dGluZ3MucGx1Z2lucy5hZGFwdGVyO1xuICAgICAgICB2YXIgdXVpZEF0dHJpYnV0ZSA9IHRoaXMuX2VsZW1lbnRGYWN0b3J5LmdldFRlbXBsYXRlKCd3aWRnZXQnKS5nZXRBdHRyaWJ1dGVOYW1lKCc8dXVpZD4nKTtcbiAgICAgICAgdmFyIHdpZGdldEZhY3RvcnkgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdXaWRnZXRGYWN0b3J5JywgY29udGV4dFJlc29sdmVyLCBlZGl0QnVmZmVySXRlbVJlZkZhY3RvcnksIHV1aWRBdHRyaWJ1dGUpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhIHRhYmxlIGZvciBzdG9yaW5nIHdpZGdldCBpbnN0YW5jZXMgYW5kIGEgdHJhY2tlciB0cmFja2VyIGZvclxuICAgICAgICAvLyBtYWludGFpbmluZyB0aGUgdGFibGUgYmFzZWQgb24gdGhlIGVkaXRvciBzdGF0ZS5cbiAgICAgICAgdmFyIHdpZGdldFN0b3JlID0gdGhpcy5fY3JlYXRlU2VydmljZSgnV2lkZ2V0U3RvcmUnLCBhZGFwdGVyKTtcblxuICAgICAgICAvLyBDcmVhdGUgYSBtZWRpYXRvciBmb3IgY29udHJvbGxpbmcgaW50ZXJhY3Rpb25zIGJldHdlZW4gdGhlIHdpZGdldFxuICAgICAgICAvLyB0YWJsZSBhbmQgdGhlIGVkaXQgYnVmZmVyLlxuICAgICAgICB2YXIgZWRpdEJ1ZmZlck1lZGlhdG9yID0gdGhpcy5fY3JlYXRlU2VydmljZSgnRWRpdEJ1ZmZlck1lZGlhdG9yJywgZWRpdEJ1ZmZlckl0ZW1SZWZGYWN0b3J5LCB0aGlzLl9lbGVtZW50RmFjdG9yeSwgY29udGV4dExpc3RlbmVyLCBhZGFwdGVyLCBjb250ZXh0UmVzb2x2ZXIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZWRpdG9yIG1vZGVsIGFuZCByZXR1cm4gaXQgdG8gdGhlIGNhbGxlci5cbiAgICAgICAgZWRpdG9yTW9kZWwgPSBuZXcgdGhpcy5fZ2xvYmFsU2V0dGluZ3Muc2VydmljZVByb3RvdHlwZXMuRWRpdG9yQ29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwoe1xuICAgICAgICAgIGlkOiBlZGl0b3JDb250ZXh0SWQsXG4gICAgICAgIH0sIHtcbiAgICAgICAgICB3aWRnZXRGYWN0b3J5OiB3aWRnZXRGYWN0b3J5LFxuICAgICAgICAgIHZpZXdGYWN0b3J5OiB0aGlzLl92aWV3RmFjdG9yeSxcbiAgICAgICAgICB3aWRnZXRTdG9yZTogd2lkZ2V0U3RvcmUsXG4gICAgICAgICAgZWRpdEJ1ZmZlck1lZGlhdG9yOiBlZGl0QnVmZmVyTWVkaWF0b3IsXG4gICAgICAgICAgY29udGV4dDogZWRpdG9yQ29udGV4dCxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ0VkaXRvclZpZXcnLCB7XG4gICAgICAgICAgbW9kZWw6IGVkaXRvck1vZGVsLFxuICAgICAgICAgIGVsOiAkZWRpdG9yRWxbMF0sXG4gICAgICAgIH0sIHtcbiAgICAgICAgICBlbGVtZW50RmFjdG9yeTogdGhpcy5fZWxlbWVudEZhY3RvcnksXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9lZGl0b3JDb2xsZWN0aW9uLnNldChlZGl0b3JNb2RlbCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ0JpbmRlcicsIGVkaXRvck1vZGVsLCBlZGl0QnVmZmVyTWVkaWF0b3IpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRXhpc3RpbmcgYmluZGVyIGFscmVhZHkgb3BlbiBmb3IgdGhpcyBlZGl0b3IgaW5zdGFuY2UuJyk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgX2luaXRpYWxpemU6IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHRoaXMuX2dsb2JhbFNldHRpbmdzID0gXy5kZWZhdWx0cyhjb25maWcsIG1vZHVsZS5leHBvcnRzLmRlZmF1bHRzKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgYWN0aW9uIGRpc3BhdGNoZXIgLyByZXNvbHV0aW9uIHNlcnZpY2VzIGZvciBoYW5kbGluZyBzeW5jaW5nXG4gICAgLy8gZGF0YSB3aXRoIHRoZSBzZXJ2ZXIuXG4gICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyID0gdGhpcy5fY3JlYXRlU2VydmljZSgnU3luY0FjdGlvblJlc29sdmVyJyk7XG4gICAgdGhpcy5fc3luY0FjdGlvbkRpc3BhdGNoZXIgPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdTeW5jQWN0aW9uRGlzcGF0Y2hlcicsIHRoaXMuX2dsb2JhbFNldHRpbmdzLnBsdWdpbnMucHJvdG9jb2wsIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlcik7XG5cbiAgICAvLyBDcmVhdGUgdGhlIHRvcCBsZXZlbCBjb2xsZWN0aW9ucyB0aGF0IGFyZSBzaGFyZWQgYWNyb3NzIGVkaXRvciBpbnN0YW5jZXMuXG4gICAgdmFyIGVkaXRvckNvbGxlY3Rpb24gPSB0aGlzLl9jcmVhdGVTZXJ2aWNlKCdFZGl0b3JDb2xsZWN0aW9uJyk7XG4gICAgdmFyIGNvbnRleHRDb2xsZWN0aW9uID0gdGhpcy5fY3JlYXRlU2VydmljZSgnQ29udGV4dENvbGxlY3Rpb24nKTtcbiAgICB2YXIgc2NoZW1hQ29sbGVjdGlvbiA9IHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ1NjaGVtYUNvbGxlY3Rpb24nLCBbXSwge1xuICAgICAgY29udGV4dENvbGxlY3Rpb246IGNvbnRleHRDb2xsZWN0aW9uLFxuICAgICAgZGlzcGF0Y2hlcjogdGhpcy5fc3luY0FjdGlvbkRpc3BhdGNoZXIsXG4gICAgfSk7XG4gICAgdGhpcy5fZWRpdG9yQ29sbGVjdGlvbiA9IHNjaGVtYUNvbGxlY3Rpb247XG4gICAgdGhpcy5fY29udGV4dENvbGxlY3Rpb24gPSBjb250ZXh0Q29sbGVjdGlvbjtcbiAgICB0aGlzLl9zY2hlbWFDb2xsZWN0aW9uID0gc2NoZW1hQ29sbGVjdGlvbjtcblxuICAgIC8vIFNldCB1cCB0aGUgY29sbGVjdGlvbnMgdGhhdCB0aGUgc3luYyBhY3Rpb24gcmVzb2x2ZXIgc2hvdWxkIHdhdGNoIGZvclxuICAgIC8vIHVwZGF0ZXMgdG8uXG4gICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyLmFkZENvbGxlY3Rpb24oJ2NvbnRleHQnLCB0aGlzLl9jb250ZXh0Q29sbGVjdGlvbik7XG4gICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyLmFkZENvbGxlY3Rpb24oJ3NjaGVtYScsIHRoaXMuX3NjaGVtYUNvbGxlY3Rpb24pO1xuICAgIHRoaXMuX3N5bmNBY3Rpb25SZXNvbHZlci5hZGRDb2xsZWN0aW9uKCdlZGl0QnVmZmVySXRlbScsIGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgICAgIHJldHVybiBjb250ZXh0Q29sbGVjdGlvbi5nZXQoYXR0cmlidXRlcy5jb250ZXh0SWQpLmVkaXRCdWZmZXI7XG4gICAgfSk7XG4gICAgdGhpcy5fc3luY0FjdGlvblJlc29sdmVyLmFkZENvbGxlY3Rpb24oJ3dpZGdldCcsIGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgICAgIHJldHVybiBlZGl0b3JDb2xsZWN0aW9uLmdldChhdHRyaWJ1dGVzLmNvbnRleHRJZCkud2lkZ2V0U3RvcmU7XG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgYW4gZWxlbWVudCBmYWN0b3J5IHRvIHByb3ZpZGUgYSBnZW5lcmljIHdheSB0byBjcmVhdGUgbWFya3VwLlxuICAgIHRoaXMuX2VsZW1lbnRGYWN0b3J5ID0gdGhpcy5fY3JlYXRlU2VydmljZSgnRWxlbWVudEZhY3RvcnknLCB0aGlzLl9nbG9iYWxTZXR0aW5ncy5lbGVtZW50cyk7XG5cbiAgICAvLyBDcmVhdGUgYSB2aWV3IGZhY3RvcnkgZm9yIGdlbmVyYXRpbmcgd2lkZ2V0IHZpZXdzLlxuICAgIHRoaXMuX3ZpZXdGYWN0b3J5ID0gdGhpcy5fY3JlYXRlU2VydmljZSgnV2lkZ2V0Vmlld0ZhY3RvcnknLCB0aGlzLl9lbGVtZW50RmFjdG9yeSwgdGhpcy5fZ2xvYmFsU2V0dGluZ3MucGx1Z2lucy5hZGFwdGVyKTtcbiAgICBmb3IgKHZhciB0eXBlIGluIHRoaXMuX2dsb2JhbFNldHRpbmdzLnZpZXdzKSB7XG4gICAgICB0aGlzLl92aWV3RmFjdG9yeS5yZWdpc3Rlcih0eXBlLCB0aGlzLl9nbG9iYWxTZXR0aW5ncy52aWV3c1t0eXBlXSk7XG4gICAgfVxuXG4gICAgLy8gTG9hZCBhbnkgaW5pdGlhbCBtb2RlbHMuXG4gICAgaWYgKGNvbmZpZy5kYXRhKSB7XG4gICAgICB0aGlzLl9zeW5jQWN0aW9uUmVzb2x2ZXIucmVzb2x2ZShjb25maWcuZGF0YSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKi9cbiAgX2NyZWF0ZUNvbnRleHRSZXNvbHZlcjogZnVuY3Rpb24oZWRpdG9yQ29udGV4dCkge1xuICAgIHZhciBzb3VyY2VDb250ZXh0QXR0cmlidXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ3dpZGdldCcpLmdldEF0dHJpYnV0ZU5hbWUoJzxjb250ZXh0PicpO1xuICAgIHZhciB0YXJnZXRDb250ZXh0QXR0cmlidXRlID0gdGhpcy5fZWxlbWVudEZhY3RvcnkuZ2V0VGVtcGxhdGUoJ2ZpZWxkJykuZ2V0QXR0cmlidXRlTmFtZSgnPGNvbnRleHQ+Jyk7XG4gICAgcmV0dXJuIHRoaXMuX2NyZWF0ZVNlcnZpY2UoJ0NvbnRleHRSZXNvbHZlcicsIHRoaXMuX2NvbnRleHRDb2xsZWN0aW9uLCBzb3VyY2VDb250ZXh0QXR0cmlidXRlLCB0YXJnZXRDb250ZXh0QXR0cmlidXRlLCBlZGl0b3JDb250ZXh0KTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNlcnZpY2UgYmFzZWQgb24gdGhlIGNvbmZpZ3VyZWQgcHJvdG90eXBlLlxuICAgKlxuICAgKiBTZXJ2aWNlIG5hbWVzIGFyZSB0aGUgc2FtZSBhcyBjbGFzcyBuYW1lcy4gV2Ugb25seSBzdXBwb3J0IHNlcnZpY2VzIHdpdGggdXBcbiAgICogdG8gZml2ZSBhcmd1bWVudHNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogICBUaGUgbmFtZSBvZiB0aGUgc2VydmljZSB0byBiZSBjcmVhdGVkLiBUaGlzIGlzIHRoZSBkZWZhdWx0IGNsYXNzIG5hbWUuXG4gICAqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICogICBUaGUgY3JlYXRlZCBzZXJ2aWNlLiBOb3RlIHRoYXQgYSBuZXcgc2VydmljZSB3aWxsIGJlIGNyZWF0ZWQgZWFjaCB0aW1lXG4gICAqICAgdGhpcyBtZXRob2QgaXMgY2FsbGVkLiBObyBzdGF0aWMgY2FjaGluZyBpcyBwZXJmb3JtZWQuXG4gICAqL1xuICBfY3JlYXRlU2VydmljZTogZnVuY3Rpb24obmFtZSkge1xuICAgIC8vIEFsbCBhcmd1bWVudHMgdGhhdCBmb2xsb3cgdGhlICduYW1lJyBhcmd1bWVudCBhcmUgaW5qZWN0ZWQgYXNcbiAgICAvLyBkZXBlbmRlbmNpZXMgaW50byB0aGUgY3JlYXRlZCBvYmplY3QuXG4gICAgdmFyIGFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgfVxuXG4gICAgLy8gV2UgZXhwbGljaXRseSBjYWxsIHRoZSBjb25zdHJ1Y3RvciBoZXJlIGluc3RlYWQgb2YgZG9pbmcgc29tZSBmYW5jeSBtYWdpY1xuICAgIC8vIHdpdGggd3JhcHBlciBjbGFzc2VzIGluIG9yZGVyIHRvIGluc3VyZSB0aGF0IHRoZSBjcmVhdGVkIG9iamVjdCBpc1xuICAgIC8vIGFjdHVhbGx5IGFuIGluc3RhbmNlb2YgdGhlIHByb3RvdHlwZS5cbiAgICB2YXIgcHJvdG90eXBlID0gdGhpcy5fZ2xvYmFsU2V0dGluZ3Muc2VydmljZVByb3RvdHlwZXNbbmFtZV07XG4gICAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICByZXR1cm4gbmV3IHByb3RvdHlwZSgpO1xuICAgICAgY2FzZSAxOlxuICAgICAgICByZXR1cm4gbmV3IHByb3RvdHlwZShhcmdzWzBdKTtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIG5ldyBwcm90b3R5cGUoYXJnc1swXSwgYXJnc1sxXSk7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHJldHVybiBuZXcgcHJvdG90eXBlKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0pO1xuICAgICAgY2FzZSA0OlxuICAgICAgICByZXR1cm4gbmV3IHByb3RvdHlwZShhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdLCBhcmdzWzNdKTtcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgcmV0dXJuIG5ldyBwcm90b3R5cGUoYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSwgYXJnc1s0XSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlYWxseSwgeW91IG5lZWQgdG8gaW5qZWN0IG1vcmUgdGhhbiBmaXZlIHNlcnZpY2VzPyBDb25zaWRlciBmYWN0b3JpbmcgJyArIG5hbWUgKyAnIGludG8gc2VwYXJhdGUgY2xhc3Nlcy4nKTtcbiAgICB9XG4gIH1cblxufSk7XG4iXX0=
