<?php

namespace Drupal\paragraphs_editor\EditorCommand;

class WidgetBinderData {

  protected $contextMap = [];

  public function getContextId($owner_id, $field_id) {
    return !empty($this->contextMap[$owner_id][$field_id]) ? $this->contextMap[$owner_id][$field_id] : NULL;
  }

  public function addModels($collection_name, array $models) {
    foreach ($models as $id => $model) {
      $this->addModel($collection_name, $id, $model);
    }
  }

  public function addModel($collection_name, $id, array $model) {
    if ($collection_name == 'context') {
      if (!empty($model['ownerId']) && !empty($model['fieldId'])) {
        $this->contextMap[$model['ownerId']][$model['fieldId']] = $id;
      }
    }
    foreach ($model as $key => $val) {
      $this->data[$collection_name][$id][$key] = $val;
    }
  }

  public function getModels($collection_name) {
    return isset($this->data[$collection_name]) ? $this->data[$collection_name] : [];
  }

  public function getModel($collection_name, $id) {
    return isset($this->data[$collection_name][$id]) ? $this->data[$collection_name][$id] : [];
  }

  public function getData() {
    return $this->data;
  }

  public function merge(WidgetBinderData $data) {
    foreach ($data->getData() as $collection_name => $models) {
      $this->addModels($collection_name, $models);
    }
    return $this;
  }

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
