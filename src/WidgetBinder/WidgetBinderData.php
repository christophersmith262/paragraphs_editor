<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

/**
 * A class for collecting widget binder data models.
 *
 * Generators act on the content tree contained in an edit buffer item to
 * generate widget binder data models which are added to this collection. This
 * collection can then be delivered over ajax or in a drupalSettings object so
 * that the front end widget binder library can process the models.
 */
class WidgetBinderData {

  /**
   * The models to be delivered.
   *
   * @var array
   */
  protected $data = [];

  /**
   * A two-dimensional mapping of contexts.
   *
   * The first key is a paragraph uuid, the second key is a field id, and the
   * value is a context id that corresponds to that editable.
   *
   * @var array
   */
  protected $contextMap = [];

  /**
   * Finds a context id for an editable area based on the uuid and field id.
   *
   * @param string $owner_id
   *   The uuid of the object that owns the editable field.
   * @param string $field_id
   *   The field id of the editable field.
   *
   * @return string
   *   The corresponding context id or NULL if no such context existed.
   */
  public function getContextId($owner_id, $field_id) {
    return !empty($this->contextMap[$owner_id][$field_id]) ? $this->contextMap[$owner_id][$field_id] : NULL;
  }

  /**
   * Adds a group of models to a collection.
   *
   * @param string $collection_name
   *   The collection to add the models to.
   * @param array $models
   *   A map where keys are model ids and values are model attributes. Each key
   *   value pair will be added to the collection.
   */
  public function addModels($collection_name, array $models) {
    foreach ($models as $id => $model) {
      $this->addModel($collection_name, $id, $model);
    }
  }

  /**
   * Adds a single model to a collection.
   *
   * @param string $collection_name
   *   The collection to add the model to.
   * @param string $id
   *   The id of the model to add.
   * @param array $model
   *   The attributes of the model to add.
   */
  public function addModel($collection_name, $id, array $model) {
    if ($collection_name == 'context') {
      if (!empty($model['ownerId']) && !empty($model['fieldId'])) {
        $map_id = !empty($model['id']) ? $model['id'] : $id;
        $this->contextMap[$model['ownerId']][$model['fieldId']] = $map_id;
      }
    }
    foreach ($model as $key => $val) {
      $this->data[$collection_name][$id][$key] = $val;
    }
  }

  /**
   * Gets all models in a collection.
   *
   * @param string $collection_name
   *   The collection to get all models for.
   *
   * @return array
   *   A map where keys are model ids and values are model attributes.
   */
  public function getModels($collection_name) {
    return isset($this->data[$collection_name]) ? $this->data[$collection_name] : [];
  }

  /**
   * Gets a specific model.
   *
   * @param string $collection_name
   *   The collection the model belongs to.
   * @param string $id
   *   The id of the model to get.
   *
   * @return array
   *   The model attributes, or an empty array if no such model existed.
   */
  public function getModel($collection_name, $id) {
    return isset($this->data[$collection_name][$id]) ? $this->data[$collection_name][$id] : [];
  }

  /**
   * Gets the raw internal data.
   *
   * @return array
   *   A two-dimensional map where the first key is the collection name, the
   *   second key is the id and the value is the model's attributes.
   */
  public function getData() {
    return $this->data;
  }

  /**
   * Maerges the models of another data object into this object.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The data to be merged.
   *
   * @return \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData
   *   Returns the mreged $this object.
   */
  public function merge(WidgetBinderData $data) {
    foreach ($data->getData() as $collection_name => $models) {
      $this->addModels($collection_name, $models);
    }
    return $this;
  }

  /**
   * Serializes the data models to a widget binder ingestible array.
   *
   * @return array
   *   An array of models to be delivered.
   */
  public function toArray() {
    $data = [];
    foreach ($this->data as $collection_name => $models) {
      foreach ($models as $id => $model) {
        $data[] = [
          'type' => $collection_name,
          'id' => $id,
          'attributes' => $model,
        ];
      }
    }
    return $data;
  }

}
