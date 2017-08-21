<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;

/**
 * Holds the state of the widget binder data compiler.
 *
 * Since each generator is defined as a service, state information cannot be
 * safely kept as a property of the generator itself. To allow generators to
 * track and aggregate progress, we introduce a state object.
 */
class WidgetBinderDataCompilerState {

  /**
   * Contains the state data that will be destroyed at the end of compilation.
   *
   * @var array
   */
  protected $temporaryData = [];

  /**
   * Contains the current compiled data.
   *
   * @var \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData
   */
  protected $compiledData;

  /**
   * Contains the list of active generator service objects.
   *
   * @var \Drupal\paragraphs_editor\WidgetBinder\GeneratorInterface[]
   */
  protected $generators;

  /**
   * The context containing the edit buffer item currently being compiled.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   */
  protected $itemContext;

  /**
   * The edit buffer item currently being compiled.
   *
   * @var \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   */
  protected $item;

  /**
   * Creates a WidgetBinderDataCompilerState object.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\GeneratorInterface[] $generators
   *   A key value map where keys are generator ids and values are generator
   *   instances that are active for the current compiler session.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The compiled data containing the models that will be delivered to the
   *   client.
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context containing the edit buffer item being compiled.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   The edit buffer item being compiled.
   *
   * @constructor
   */
  public function __construct(array $generators, WidgetBinderData $data, CommandContextInterface $context, EditBufferItemInterface $item) {
    $this->compiledData = $data;
    $this->generators = $generators;
    $this->itemContext = $context;
    $this->item = $item;
  }

  /**
   * Getter for the compiled widget binder data.
   *
   * @return \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData
   *   The widget binder data to be delivered to the client.
   */
  public function getCompiledData() {
    return $this->compiledData;
  }

  /**
   * Getter for the context containing the item being edited.
   *
   * @return \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   *   The context containing the item being edited.
   */
  public function getItemContext() {
    return $this->itemContext;
  }

  /**
   * Getter for the edit buffer item being compiled.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   *   The edit buffer item being compiled.
   */
  public function getItem() {
    return $this->item;
  }

  /**
   * Gets a generator by its generator id.
   *
   * @return \Drupal\paragraphs_editor\WidgetBinder\GeneratorInterface
   *   The generator service implementation assocaited with a generator id, or
   *   NULL if no such generator exists.
   */
  public function getGenerator($id) {
    return !empty($this->generators[$id]) ? $this->generators[$id] : NULL;
  }

  /**
   * Gets a key from the temporary state store.
   *
   * @param string $key
   *   A key entry to get the value for, or NULL to return an array of all
   *   values.
   *
   * @return mixed
   *   The value associated with the specified key, or an array of all key value
   *   pairs if NULL was passed.
   */
  public function get($key = NULL) {
    if (isset($key)) {
      return isset($this->temporaryData[$key]) ? $this->temporaryData[$key] : NULL;
    }
    else {
      return $this->temporaryData;
    }
  }

  /**
   * Sets a temporary state value.
   *
   * @param string $key
   *   The key of the temporary value to set.
   * @param mixed $value
   *   The value to store in the temporary state cache.
   */
  public function set($key, $value) {
    $this->temporaryData[$key] = $value;
  }

}
