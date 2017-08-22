<?php

namespace Drupal\Tests\paragraphs_editor\Kernel\EditorFieldValue;

use Drupal\Core\Entity\ContentEntityStorageInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\KernelTests\KernelTestBase;
use Drupal\field\Entity\FieldConfig;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManager;
use Drupal\Tests\paragraphs_editor\Traits\TestContentGenerationTrait;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManager
 * @group paragraphs_editor
 */
class FieldValueManagerKernelTest extends KernelTestBase {
  use TestContentGenerationTrait;

  protected $strictConfigSchema = FALSE;

  protected static $testElement = [
    'tag' => 'test-element',
    'attributes' => [
      'data-test' => '<test-attribute>',
      'class' => 'test-class1 test-class2',
    ],
  ];

  static public $modules = [
    'system',
    'user',
    'entity_reference_revisions',
    'paragraphs',
    'field',
    'filter',
    'text',
    'node',
    'editor_assets',
    'dom_processor',
    'paragraphs_editor',
    'paragraphs_editor_test'
  ];

  public function setUp() {
    parent::setUp();
    $this->installEntitySchema('user');
    $this->installEntitySchema('node');
    $this->installEntitySchema('paragraph');
    $this->installConfig('field');
    $this->installConfig('text');
    $this->installConfig('node');
    $this->installConfig('paragraphs_editor_test');
  }

  public function testGetReferencedEntities() {
    $field_value_manager = $this->createFieldValueManager();
    $storage = $this->container->get('entity_type.manager')->getStorage('paragraph');

    // Test getting entities on a new paragraph.
    $paragraph = $this->generateTabs($storage, 3);
    $entities = $field_value_manager->getReferencedEntities($paragraph->field_tabs);
    $this->assertCount(3, $entities);

    $paragraph = $this->generateTabs($storage, 5);
    $paragraph->save();
    $storage->resetCache([$paragraph->id()]);
    $paragraph = $paragraph->load($paragraph->id());

    // Test getting entities on a saved paragraph with static revision caching.
    $prophecy = $this->prophesize(ContentEntityStorageInterface::CLASS);
    foreach ($paragraph->field_tabs as $item) {
      $prophecy->loadRevision($item->target_revision_id)
        ->willReturn(new \stdClass())
        ->shouldBeCalledTimes(1);
    }
    $field_value_manager = $this->createFieldValueManager($prophecy->reveal());
    $entities = $field_value_manager->getReferencedEntities($paragraph->field_tabs);
    $this->assertCount(5, $entities);
    $entities = $field_value_manager->getReferencedEntities($paragraph->field_tabs);
    $this->assertCount(5, $entities);
  }

  /**
   * @dataProvider wrapperItemProvider
   */
  public function testWrapItems($text_count, $ref_count) {
    $field_value_manager = $this->createFieldValueManager();
    $storage = $this->container->get('entity_type.manager')->getStorage('paragraph');

    $referenced_entities = [];
    for ($i = 0; $i < $text_count; $i++) {
      $text_entity = $this->generateEditorText($storage);
      $referenced_entities[] = [
        'entity' => $text_entity,
        'target_id' => $text_entity->id(),
        'target_revision_id' => $text_entity->getRevisionId(),
      ];
    }
    for ($i = 0; $i < $ref_count; $i++) {
      $referenced_entity = $this->generateTabs($storage);
      $referenced_entities[] = [
        'entity' => $referenced_entity,
        'target_id' => $referenced_entity->id(),
        'target_revision_id' => $referenced_entity->getRevisionId(),
      ];
    }
    $paragraph = $this->generateTab($storage);
    $paragraph->field_content->setValue($referenced_entities);
    $paragraph->field_content->getFieldDefinition()->setThirdPartySetting('paragraphs_editor', 'text_bundle', 'paragraphs_editor_text');
    $paragraph->field_content->getFieldDefinition()->setThirdPartySetting('paragraphs_editor', 'text_field', 'field_paragraphs_editor_text');
    $paragraph->field_content->getFieldDefinition()->setThirdPartySetting('paragraphs_editor', 'filter_format', 'default');
    $wrapper = $field_value_manager->wrapItems($paragraph->field_content);

    $expected_markup = '';
    for ($i = 0; $i < $text_count; $i++) {
      $expected_markup .= 'test_markup';
    }

    $this->assertEquals('default', $wrapper->getFormat());
    $this->assertEquals($expected_markup, $wrapper->getMarkup());
    $this->assertCount($ref_count, $wrapper->getReferencedEntities());
  }

  public function wrapperItemProvider() {
    return [
      [ 0, 0 ],
      [ 1, 0 ],
      [ 0, 1 ],
      [ 2, 1 ],
    ];
  }

  public function testPrepareEntityForSave() {
    $field_value_manager = $this->createFieldValueManager();
    $storage = $this->container->get('entity_type.manager')->getStorage('paragraph');
    $paragraph = $this->generateTab($storage);
    $paragraph->save();
    $this->assertFalse($paragraph->needsSave());
    $field_value_manager->prepareEntityForSave($paragraph, TRUE, 'de');
    $this->assertTrue($paragraph->needsSave());
    $this->assertTrue($paragraph->isNewRevision());
    $this->assertEquals('de', $paragraph->get('langcode')->value);

    $paragraph = $this->generateTab($storage);
    $paragraph->save();
    $field_value_manager->prepareEntityForSave($paragraph, FALSE, NULL);
    $this->assertTrue($paragraph->needsSave());
    $this->assertFalse($paragraph->isNewRevision());
    $this->assertEquals('en', $paragraph->get('langcode')->value);
  }

  public function testSetItems() {
    $field_value_manager = $this->createFieldValueManager();
    $storage = $this->container->get('entity_type.manager')->getStorage('paragraph');

    $embedded_paragraphs = [
      $this->generateTabs($storage, 0),
      $this->generateTabs($storage, 0),
    ];
    $target_paragraph = $this->generateTab($storage);
    $field_value_manager->setItems($target_paragraph->field_content, $embedded_paragraphs);
    $this->assertEquals($embedded_paragraphs, $target_paragraph->field_content->referencedEntities());

    $target_paragraph->save();
    foreach ($target_paragraph->field_content->referencedEntities() as $delta => $entity) {
      $this->assertEquals($embedded_paragraphs[$delta]->uuid(), $entity->uuid());
    }

    $storage->resetCache([$target_paragraph->id()]);
    $target_paragraph = $storage->load($target_paragraph->id());
    $embedded_paragraphs = [$this->generateTabs($storage, 0)];
    $field_value_manager->setItems($target_paragraph->field_content, $embedded_paragraphs);
    $this->assertEquals($embedded_paragraphs, $target_paragraph->field_content->referencedEntities());

    $target_paragraph->save();
    $storage->resetCache([$target_paragraph->id()]);
    $target_paragraph = $storage->load($target_paragraph->id());
    foreach ($target_paragraph->field_content->referencedEntities() as $delta => $entity) {
      $this->assertEquals($embedded_paragraphs[$delta]->uuid(), $entity->uuid());
    }
  }

  public function testGetTextBundles() {
    $field_value_manager = $this->createFieldValueManager();
    $this->assertEquals([
      'paragraphs_editor_text' => [
        'label' => 'Text',
        'text_field' => 'field_paragraphs_editor_text',
      ],
    ], $field_value_manager->getTextBundles());
  }

  /**
   * @dataProvider fieldGenerator
   */
  public function testIsParagraphsField($entity_type, $bundle, $field_name, $is_paragraphs, $is_editor) {
    $field_value_manager = $this->createFieldValueManager();
    $field_config = FieldConfig::loadByName($entity_type, $bundle, $field_name);
    $this->assertEquals($is_paragraphs, $field_value_manager->isParagraphsField($field_config));
  }

  /**
   * @dataProvider fieldGenerator
   */
  public function testIsParagraphsEditorField($entity_type, $bundle, $field_name, $is_paragraphs, $is_editor) {
    $field_value_manager = $this->createFieldValueManager();
    $field_config = FieldConfig::loadByName($entity_type, $bundle, $field_name);
    $this->assertEquals($is_editor, $field_value_manager->isParagraphsEditorField($field_config));
  }

  public function fieldGenerator() {
    return [
      ['paragraph', 'tabs', 'field_tabs', TRUE, FALSE],
      ['paragraph', 'tab', 'field_title', FALSE, FALSE],
      ['paragraph', 'tab', 'field_content', TRUE, TRUE],
    ];
  }

  public function testGetElement() {
    // Test get known element.
    $field_value_manager = $this->createFieldValueManager();
    $element = $field_value_manager->getElement('test');

    // Test get unkown element.
    $this->assertEquals(static::$testElement, $element);
    $element = $field_value_manager->getElement('test2');
    $this->assertNull($element);
  }

  public function testGetAttributeName() {
    // Test get known attribute.
    $field_value_manager = $this->createFieldValueManager();
    $attribute_name = $field_value_manager->getAttributeName('test', '<test-attribute>');
    $this->assertEquals('data-test', $attribute_name);

    // Test get unknown attribute.
    $attribute_name = $field_value_manager->getAttributeName('test', '<edit>');
    $this->assertNull($attribute_name);

    // Test get unknown element.
    $attribute_name = $field_value_manager->getAttributeName('test2', '<test-attribute>');
    $this->assertNull($attribute_name);
  }

  public function testGetSelector() {
    // Test known selector.
    $field_value_manager = $this->createFieldValueManager();
    $selector = $field_value_manager->getSelector('test');
    $this->assertEquals('test-element.test-class1.test-class2', $selector);

    // Test unknown selector.
    $selector = $field_value_manager->getSelector('test2');
    $this->assertEmpty($selector);
  }

  protected function createFieldValueManager($storage = NULL) {
    $entity_type_manager = $this->container->get('entity_type.manager');
    if ($storage) {
      $prophecy = $this->prophesize(EntityTypeManagerInterface::CLASS);
      $prophecy->getStorage('paragraph')->willReturn($storage);
      $prophecy->getStorage('paragraphs_type')->willReturn($entity_type_manager->getStorage('paragraphs_type'));
      $entity_type_manager = $prophecy->reveal();
    }
    return new FieldValueManager(
      $this->container->get('entity_field.manager'),
      $entity_type_manager,
      [
        'test' => static::$testElement,
      ]
    );
  }
}
