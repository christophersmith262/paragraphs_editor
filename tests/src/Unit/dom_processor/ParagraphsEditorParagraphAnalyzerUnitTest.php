<?php

namespace Drupal\Tests\paragraphs_editor\Unit\dom_processor;

use Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer\ParagraphsEditorParagraphAnalyzer;
use Drupal\Tests\UnitTestCase;
use Drupal\dom_processor\DomProcessor\SemanticData;
use Prophecy\Argument;

use Drupal\Core\Entity\EntityStorageInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\Core\Config\Entity\ThirdPartySettingsInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

use Drupal\Component\Utility\Html;
use Symfony\Component\CssSelector\CssSelectorConverter;

trait DomProcessorUnitTestTrait {

  protected function createSemanticData($markup, array $info) {
    $document = Html::load($markup);
    $xpath = new \DOMXpath($document);
    $converter = new CssSelectorConverter();

    $data = NULL;
    foreach ($info as $item) {
      $selector = $converter->toXPath($item['selector']);
      $selected = $xpath->query($selector);
      if (!$selected->length) {
        throw new \Exception('Could not load "' . $selector . '"');
      }
      $data = SemanticData::create($selected[0], $xpath, $item['data'], $data);
    }

    return $data;
  }
}

/**
 * @coversDefaultClass Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer\ParagraphsEditorParagraphAnalyzer
 *
 * @group paragraphs_editor
 */
class ParagraphsEditorParagraphAnalyzerUnitTest extends UnitTestCase {
  use DomProcessorUnitTestTrait;

  public function testAnalyzeParagraphFromContext() {
    $paragraph = $this->createParagraph('uuid1');
    $field_definition = $this->createFieldDefinition('field_root');
    $items = $this->createItems($field_definition);

    $data = $this->createSemanticData(
      '<paragraph data-context-hint="context1" data-uuid="uuid1"></paragraph>',
      [
        [
          'selector' => 'paragraph',
          'data' => [
            'field' => [
              'items' => $items,
              'context_id' => 'context1',
              'is_mutable' => TRUE,
            ],
          ],
        ],
      ]
    );
    $analyzer = $this->createAnalyzer(['context1' => [$paragraph]]);
    $data = $analyzer->analyze($data);
    $this->assertEquals($data->get('paragraph.entity'), $paragraph);
    $this->assertEquals($data->get('paragraph.context_id'), 'context1');
  }

  public function testAnalyzeParagraphFromField() {
    $paragraph = $this->createParagraph('uuid1');
    $field_definition = $this->createFieldDefinition('field_root');
    $items = $this->createItems($field_definition, [$paragraph]);

    $data = $this->createSemanticData(
      '<paragraph data-uuid="uuid1"></paragraph>',
      [
        [
          'selector' => 'paragraph',
          'data' => [
            'field' => [
              'items' => $items,
            ],
          ],
        ],
      ]
    );
    $analyzer = $this->createAnalyzer();
    $data = $analyzer->analyze($data);
    $this->assertEquals($data->get('paragraph.entity'), $paragraph);
    $this->assertEmpty($data->get('paragraph.context_id'));
  }

  public function testAnalyzeParagraphFromStorage() {
    $paragraph = $this->createParagraph('uuid1');
    $data = $this->createSemanticData(
      '<paragraph data-uuid="uuid1"></paragraph>',
      [
        [
          'selector' => 'paragraph',
          'data' => [],
        ],
      ]
    );
    $analyzer = $this->createAnalyzer([], [$paragraph]);
    $data = $analyzer->analyze($data);
    $this->assertEquals($data->get('paragraph.entity'), $paragraph);
    $this->assertEmpty($data->get('paragraph.context_id'));
  }

  public function testAnalyzeMutableField() {
    $field_definition = $this->createFieldDefinition('field_mutable');
    $items = $this->createItems($field_definition);
    $paragraph = $this->createParagraph('uuid1', [$items]);
    $data = $this->createSemanticData(
      '<paragraph-field data-field-name="field_mutable" data-mutable="true" data-context="context1"></paragraph-field>',
      [
        [
          'selector' => 'paragraph-field',
          'data' => [
            'paragraph' => [
              'entity' => $paragraph,
            ],
          ],
        ],
      ]
    );
    $analyzer = $this->createAnalyzer(
      [
        'uuid1' => [],
      ]
    );
    $data = $analyzer->analyze($data);
    $this->assertEquals($data->get('field.items'), $items);
    $this->assertEquals($data->get('field.context_id'), 'context1');
    $this->assertEquals($data->get('field.is_mutable'), TRUE);
    $this->assertEquals($data->get('field.wrapper'), TRUE);
  }

  public function testAnalyzeStaticField() {
    $field_definition = $this->createFieldDefinition('field_notmutable');
    $items = $this->createItems($field_definition);
    $paragraph = $this->createParagraph('uuid1', [$items]);
    $data = $this->createSemanticData(
      '<paragraph-field data-field-name="field_notmutable" data-mutable="false"></paragraph-field>',
      [
        [
          'selector' => 'paragraph-field',
          'data' => [
            'paragraph' => [
              'entity' => $paragraph,
            ],
          ],
        ],
      ]
    );
    $analyzer = $this->createAnalyzer(
      [
        'uuid1' => [],
      ]
    );
    $data = $analyzer->analyze($data);
    $this->assertEquals($data->get('field.items'), $items);
    $this->assertEmpty($data->get('field.context_id'));
    $this->assertEquals($data->get('field.is_mutable'), FALSE);
    $this->assertEmpty($data->get('field.wrapper'));
  }

  protected function createParagraph($uuid, array $fields = []) {
    $prophecy = $this->prophesize(ParagraphInterface::CLASS);
    $prophecy->uuid()->willReturn($uuid);
    $paragraph = $prophecy->reveal();
    foreach ($fields as $items) {
      $paragraph->{$items->getFieldDefinition()->getName()} = $items;
    }
    return $paragraph;
  }

  protected function createFieldDefinition($field_name) {
    $prophecy = $this->prophesize(FieldDefinitionInterface::CLASS);
    $prophecy->willImplement(ThirdPartySettingsInterface::CLASS);
    $prophecy->getName()->willReturn($field_name);
    return $prophecy->reveal();
  }

  protected function createItems($field_definition, array $referenced_entities = []) {
    $prophecy = $this->prophesize(EntityReferenceFieldItemListInterface::CLASS);
    $prophecy->getFieldDefinition()->willReturn($field_definition);
    $prophecy->referencedEntities()->willReturn($referenced_entities);
    return $prophecy->reveal();
  }

  protected function createFieldValueManager() {
    $prophecy = $this->prophesize(FieldValueManagerInterface::CLASS);
    $prophecy->isParagraphsField(Argument::any())->willReturn(True);
    $prophecy->isParagraphsEditorField(Argument::any())->willReturn(True);
    $prophecy->wrapItems(Argument::any())->willReturn(TRUE);
    return $prophecy->reveal();
  }

  protected function createContextFactory(array $contexts) {
    $prophecy = $this->prophesize(CommandContextFactoryInterface::CLASS);
    foreach ($contexts as $context_id => $context) {
      $context = $this->createContext($context);
      $prophecy->get($context_id)->willReturn($context);
    }
    return $prophecy->reveal();
  }

  protected function createContext(array $entities) {
    $edit_buffer_prophecy = $this->prophesize(EditBufferInterface::CLASS);
    foreach ($entities as $entity) {
      $buffer_item_prophecy = $this->prophesize(EditBufferItemInterface::CLASS);
      $buffer_item_prophecy->getEntity()->willReturn($entity);
      $buffer_item = $buffer_item_prophecy->reveal();
      $edit_buffer_prophecy->getItem($entity->uuid())->willReturn($buffer_item);
    }
    $edit_buffer = $edit_buffer_prophecy->reveal();

    $prophecy = $this->prophesize(CommandContextInterface::CLASS);
    $prophecy->getEditBuffer()->willReturn($edit_buffer);

    return $prophecy->reveal();
  }

  protected function createEntityStorage($entity_type, array $entities = []) {
    $prophecy = $this->prophesize(EntityStorageInterface::CLASS);
    foreach ($entities as $entity) {
      $prophecy->loadByProperties([
        'uuid' => $entity->uuid(),
      ])->willReturn([$entity]);
    }
    return $prophecy->reveal();
  }

  protected function createEntityTypeManager(array $storages = []) {
    $prophecy = $this->prophesize(EntityTypeManagerInterface::CLASS);
    foreach ($storages as $entity_type => $storage) {
      $prophecy->getStorage($entity_type)->willReturn($storage);
    }
    return $prophecy->reveal();
  }

  protected function createAnalyzer(array $contexts = [], array $entities = []) {
    $storage = $this->createEntityStorage('paragraph', $entities);
    return new ParagraphsEditorParagraphAnalyzer(
      $this->createFieldValueManager(),
      [
        'widget' => [
          'tag' => 'paragraph',
          'attributes' => [
            'data-context-hint' => '<context>',
            'data-uuid' => '<uuid>',
          ],
        ],
        'field' => [
          'tag' => 'paragraph-field',
          'attributes' => [
            'data-context' => '<context>',
            'data-field-name' => '<name>',
            'data-mutable' => '<editable>',
          ],
        ],
      ],
      $this->createEntityTypeManager(['paragraph' => $storage]),
      $this->createContextFactory($contexts)
    );
  }
}
