<?php

namespace Drupal\paragraphs_ckeditor\ParagraphDom;

use Drupal\Core\Database;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\Sql\SqlContentEntityStorageSchema;
use Drupal\Core\Field\FieldConfigInterface;

class MarkupStorage {

  protected $database;
  protected $entityTypeManager;
  protected $entityFieldManager;

  public function __construct(Database\Connection $database, EntityTypeManagerInterface $entity_type_manager, EntityFieldManagerInterface $entity_field_manager) {
    $this->database = $database;
    $this->entityTypeManager = $entity_type_manager;
    $this->entityFieldManager = $entity_field_manager;
  }

  public function updateSchema(FieldConfigInterface $field_config) {
    if ($this->isParagraphsField($field_config)) {
      $schema = $this->database->schema();
      $entity_type_id = $field_config->getTargetEntityTypeId();
      $entity_type = $this->entityTypeManager->getDefinition($entity_type_id);

      $table_name = $this->getTableName($field_config);
      if (!$schema->tableExists($table_name)) {
        $schema->createTable($table_name, $this->schema($field_config));
      }

      if ($entity_type->isRevisionable()) {
        $table_name = $this->getTableName($field_config, 'revision');
        if (!$schema->tableExists($table_name)) {
          $schema->createTable($table_name, $this->schema($field_config));
        }
      }
    }
  }

  public function uninstallSchema(FieldConfigInterface $field_config) {
    if ($this->isParagraphsField($field_config)) {
      $schema = $this->database->schema();
      $schema->dropTable($this->getTableName($field_config));
      $schema->dropTable($this->getTableName($field_config, 'revision'));
    }
  }

  public function load(FieldConfigInterface $field_config, EntityInterface $entity) {
    $this->database->select($this->getTableName($field_config));
  }

  public function save(FieldConfigInterface $field_config, EntityInterface $entity, $markup) {
    $this->database->merge($this->getTableName($field_config));
  }

  protected function isParagraphsField(FieldConfigInterface $field_config) {
    return ($field_config->getType() == 'entity_reference_revisions'
      && $field_config->getSetting('target_type') == 'paragraph');
  }

  protected function getTableName(FieldConfigInterface $field_config, $type = NULL) {
    $entity_type_id = $field_config->getTargetEntityTypeId();
    $storage_definition = $field_config->getFieldStorageDefinition();
    $storage = $this->entityTypeManager->getStorage($entity_type_id);
    $table_mapping = $storage->getTableMapping(array($storage_definition));

    if ($type == 'revision') {
      return $table_mapping->getDedicatedRevisionTableName($storage_definition) . '__paragraphs_ckeditor_markup';
    }
    else {
      return $table_mapping->getDedicatedDataTableName($storage_definition) . '__paragraphs_ckeditor_markup';
    }
  }

  protected function schema(FieldConfigInterface $field_config) {
    $entity_type_id = $field_config->getTargetEntityTypeId();
    $entity_type = $this->entityTypeManager->getDefinition($entity_type_id);
    $field_storage_definitions = $this->entityFieldManager->getFieldStorageDefinitions($entity_type_id);

    // Create the entity id field.
    $id_definition = $field_storage_definitions[$entity_type->getKey('id')];
    if ($id_definition->getType() == 'integer') {
      $id_schema = array(
        'type' => 'int',
        'unsigned' => TRUE,
        'not null' => TRUE,
      );
    }
    else {
      $id_schema = array(
        'type' => 'varchar_ascii',
        'length' => 128,
        'not null' => TRUE,
      );
    }

    // Define the revision ID schema.
    if (!$entity_type->isRevisionable()) {
      $revision_id_schema = $id_schema;
    }
    elseif ($field_storage_definitions[$entity_type->getKey('revision')]->getType() == 'integer') {
      $revision_id_schema = array(
        'type' => 'int',
        'unsigned' => TRUE,
        'not null' => TRUE,
      );
    }
    else {
      $revision_id_schema = array(
        'type' => 'varchar',
        'length' => 128,
        'not null' => TRUE,
      );
    }

    return array(
      'fields' => array(
        'entity_id' => $id_schema,
        'revision_id' => $revision_id_schema,
        'langcode' => array(
          'type' => 'varchar_ascii',
          'length' => 32,
          'not null' => TRUE,
          'default' => '',
        ),
        'value' => array(
          'type' => 'text',
          'size' => 'big',
        ),
        'format' => array(
          'type' => 'varchar_ascii',
          'length' => 255,
        ),
      ),
      'primary key' => array('entity_id', 'revision_id', 'langcode'),
    );
  }
}
