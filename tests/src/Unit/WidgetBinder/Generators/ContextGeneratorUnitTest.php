<?php

namespace Drupal\Tests\paragraphs_editor\Unit\WidgetBinder\Generators;

use Drupal\Core\Field\FieldConfigInterface;
use Drupal\Core\Render\RenderContext;
use Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\WidgetBinder\Generators\ContextGenerator;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;
use Drupal\Tests\paragraphs_editor\Traits\MockContextTrait;
use Drupal\Tests\UnitTestCase;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\WidgetBinder\Generators\ContextGenerator
 * @group paragraphs_editor
 */
class ContextGeneratorUnitTest extends UnitTestCase {
  use MockContextTrait;

  public function testInitialize() {
    $context = $this->createContext();
    $context->addAdditionalContext('editableContexts', [
      'uuid1' => [
        'field_tabs' => 'context1',
      ],
      'uuid2' => [
        'field_content' => 'context2',
      ],
    ]);
    $item = $context->getEditBuffer()->createItem($this->createMockParagraph());

    $data = new WidgetBinderData();
    $state = new WidgetBinderDataCompilerState([], $data, $context, $item);
    $generator = new ContextGenerator($this->createContextFactory());
    $generator->initialize($data, $state, $item->getEntity());

    $this->assertEquals([
      'uuid1' => [ 'field_tabs' => 'context1' ],
      'uuid2' => [ 'field_content' => 'context2' ],
    ], $state->get('regenerate_contexts'));
  }

  public function testProcessField() {
    $context = $this->createContext();
    $item = $context->getEditBuffer()->createItem($this->createMockParagraph());
    $data = new WidgetBinderData();
    $state = new WidgetBinderDataCompilerState([], $data, $context, $item);

    $state->set('generated_contexts', []);
    $state->set('regenerate_contexts', [
      'uuid1' => [ 'field_tabs' => 'context1' ],
      'uuid2' => [ 'field_content' => 'context2' ],
    ]);

    $context1 = $this->createContext([ 'context_id' => 'context1' ]);
    $context2 = $this->createContext([ 'context_id' => 'context2' ]);
    $context3 = $this->createContext([ 'context_id' => 'context3' ]);
    $context4 = $this->createContext([ 'context_id' => 'context4' ]);
    $context5 = $this->createContext([ 'context_id' => 'context5' ]);
    $prophecy = $this->prophesize(CommandContextFactoryInterface::CLASS);
    $prophecy->get('context1')->willReturn($context1)->shouldBeCalledTimes(1);
    $prophecy->get('context2')->willReturn($context2)->shouldBeCalledTimes(1);
    $prophecy->regenerate($context1)->willReturn($context3)->shouldBeCalledTimes(1);
    $prophecy->regenerate($context2)->willReturn($context4)->shouldBeCalledTimes(1);
    $prophecy->create('field_new', '4')->willReturn($context5)->shouldBeCalledTimes(1);
    $generator = new ContextGenerator($prophecy->reveal());

    $generator->processField($data, $state, $this->createFieldItems(2, 'uuid2', 'field_content'), TRUE);
    $generator->processField($data, $state, $this->createFieldItems(3, 'uuid3', 'field_noneditable'), FALSE);
    $generator->processField($data, $state, $this->createFieldItems(1, 'uuid1', 'field_tabs'), TRUE);
    $generator->processField($data, $state, $this->createFieldItems(4, 'uuid4', 'field_new'), TRUE);

    $this->assertEquals([
      'context2' => [
        'id' => 'context4',
        'ownerId' => 'uuid2',
        'fieldId' => 'field_content',
      ],
      'context1' => [
        'id' => 'context3',
        'ownerId' => 'uuid1',
        'fieldId' => 'field_tabs',
      ],
      'context5' => [
        'id' => 'context5',
        'ownerId' => 'uuid4',
        'fieldId' => 'field_new',
        'schemaId' => 'field_new',
      ],
    ], $data->getModels('context'));
  }

  protected function createFieldItems($id, $uuid, $field_id) {
    $prophecy = $this->prophesize(EntityReferenceRevisionsFieldItemList::CLASS);
    $prophecy->getEntity()->willReturn($this->createMockParagraph([ 'id' => $id, 'uuid' => $uuid ]));
    $prophecy_factory = $this;
    $prophecy->getFieldDefinition()->will(function () use ($prophecy_factory, $field_id) {
      $prophecy = $prophecy_factory->prophesize(FieldConfigInterface::CLASS);
      $prophecy->id()->willReturn($field_id);
      return $prophecy->reveal();
    });
    return $prophecy->reveal();
  }

}

