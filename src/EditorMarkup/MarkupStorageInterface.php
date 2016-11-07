<?php

interface MarkupStorage {
  public function createSchema(FieldConfigInterface $field_config);
  public function updateSchema(FieldConfigInterface $field_config);
  public function deleteSchema(FieldConfigInterface $field_config);
  public function readValue(FieldConfigInterface $field_config, EntityInterface $entity);
  public function writeValue(FieldConfigInterface $field_config, EntityInterface $entity, $markup);
}
