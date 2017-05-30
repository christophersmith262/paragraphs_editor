<?php

namespace Drupal\paragraphs_editor\EditorCommand;

class WidgetBinderData {

  public function addModels($collection_name, array $models) {
    foreach ($models as $id => $model) {
      $this->addModel($collection_name, $id, $model);
    }
  }

  public function addModel($collection_name, $id, array $model) {
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

  public function toArray() {
    return $this->data;
  }
}
