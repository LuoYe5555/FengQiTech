//源码出自 冷殇科技
//有部分改动
//如有侵权请联系删除

// ============================================
// 配方拆解器 - 将Slimefun粘液物品拆解为合成材料
// 使用方法：主手持拆解器，副手持粘液物品，右键使用
// ============================================

// 物品的显示名称（带颜色代码：§e=黄色，§l=加粗）
const DISPLAY_NAME = '&#DAD65F物&#CED860品&#C3DA61拆&#B7DC62解&#ACDE63器';

/* ===== 获取 Slimefun 物品信息 =====
 * 参数：item - 要检查的物品
 * 返回：包含物品ID、配方、配方类型、产出数量等信息的对象，如果不是粘液物品则返回null
 */
function getSlimefunItemInfo(item) {
    // 检查物品是否为空或空气
    if (!item || item.getType() === org.bukkit.Material.AIR) {
        return null;
    }

    try {
        // 通过反射获取Slimefun的SlimefunItem类
        const sfItemClass = java.lang.Class.forName('io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem');

        // 获取静态方法getByItem，用于根据ItemStack获取对应的SlimefunItem对象
        const getByItemMethod = sfItemClass.getMethod('getByItem', org.bukkit.inventory.ItemStack.class);
        const sfItem = getByItemMethod.invoke(null, item); // null表示静态方法

        // 如果不是Slimefun物品，返回null
        if (!sfItem) {
            return null;
        }

        // 获取物品ID（如：NTW_SIMPLE_NANOBOTS）
        const getIdMethod = sfItemClass.getMethod('getId');
        const id = getIdMethod.invoke(sfItem);

        // 获取合成配方（输入材料数组）
        let recipe = null;
        try {
            const getRecipeMethod = sfItemClass.getMethod('getRecipe');
            recipe = getRecipeMethod.invoke(sfItem);
        } catch (e) {
            recipe = null;
        }

        // 获取配方类型（用于判断是否是工作台配方）
        let recipeType = null;
        let recipeTypeKey = null;
        try {
            const getRecipeTypeMethod = sfItemClass.getMethod('getRecipeType');
            recipeType = getRecipeTypeMethod.invoke(sfItem);

            if (recipeType) {
                // 尝试获取配方类型的key（如：ENHANCED_CRAFTING_TABLE）
                try {
                    const getKeyMethod = recipeType.getClass().getMethod('getKey');
                    const key = getKeyMethod.invoke(recipeType);
                    if (key) {
                        recipeTypeKey = key.toString();
                    }
                } catch (e1) {
                    // 备用方案：直接toString或获取类名
                    try {
                        recipeTypeKey = recipeType.toString();
                    } catch (e2) {
                        recipeTypeKey = recipeType.getClass().getSimpleName();
                    }
                }
            }
        } catch (e) {
            recipeType = null;
        }

        // 获取配方产出数量（一次合成出几个物品）
        let outputAmount = 1; // 默认产出1个
        try {
            // 方法1：尝试获取recipeOutput字段（SlimefunItem中存储产出物品的字段）
            try {
                const recipeOutputField = sfItemClass.getDeclaredField('recipeOutput');
                recipeOutputField.setAccessible(true); // 设置可访问私有字段
                const recipeOutput = recipeOutputField.get(sfItem);
                if (recipeOutput && recipeOutput.getAmount) {
                    outputAmount = recipeOutput.getAmount();
                }
            } catch (e1) {
                // 方法2：尝试获取output字段
                try {
                    const outputField = sfItemClass.getDeclaredField('output');
                    outputField.setAccessible(true);
                    const output = outputField.get(sfItem);
                    if (output && output.getAmount) {
                        outputAmount = output.getAmount();
                    }
                } catch (e2) {
                    outputAmount = 1;
                }
            }
        } catch (e) {
            outputAmount = 1;
        }

        // 确保产出数量至少为1
        if (!outputAmount || outputAmount < 1) {
            outputAmount = 1;
        }

        // 返回收集到的所有信息
        return {
            item: sfItem,           // SlimefunItem对象
            id: id ? id.toString() : null,  // 物品ID字符串
            recipe: recipe,         // 合成配方（输入材料）
            recipeType: recipeType, // 配方类型对象
            recipeTypeKey: recipeTypeKey,   // 配方类型名称
            outputAmount: outputAmount      // 配方产出数量
        };

    } catch (e) {
        // 发生任何错误，返回null
        return null;
    }
}

/* ===== 检查是否是有效的配方数组 =====
 * 参数：recipe - 配方对象（可能是JS数组或Java数组）
 * 返回：true表示是有效的配方数组
 */
function isValidRecipeArray(recipe) {
    if (!recipe) return false;

    try {
        // 检查是否是JavaScript数组
        if (recipe instanceof Array) {
            return recipe.length > 0;
        }

        // 检查是否是Java的ItemStack数组
        const className = recipe.getClass().getName();
        if (className.includes('[') && className.includes('ItemStack')) {
            // 使用Java反射获取数组长度
            return java.lang.reflect.Array.getLength(recipe) > 0;
        }

        return false;
    } catch (e) {
        return false;
    }
}

/* ===== 从配方中提取材料（按物品名字区分） =====
 * 参数：recipe - 配方数组
 * 返回：材料列表，每个材料包含：物品克隆、名字、数量、最大堆叠数
 */
function extractMaterials(recipe) {
    const materials = [];

    if (!recipe) return materials;

    try {
        let items = null;

        // 处理不同类型的配方输入
        // 情况1：已经是JavaScript数组
        if (recipe instanceof Array) {
            items = recipe;
        }
        // 情况2：是Java数组（ItemStack[]）
        else if (recipe.getClass().isArray()) {
            const length = java.lang.reflect.Array.getLength(recipe);
            items = [];
            // 将Java数组转换为JavaScript数组
            for (let i = 0; i < length; i++) {
                items.push(java.lang.reflect.Array.get(recipe, i));
            }
        }
        // 情况3：是某种配方对象，尝试调用getInput()方法
        else {
            try {
                const getInputMethod = recipe.getClass().getMethod('getInput');
                const input = getInputMethod.invoke(recipe);
                if (input) {
                    if (input instanceof Array) {
                        items = input;
                    } else if (input.getClass().isArray()) {
                        const length = java.lang.reflect.Array.getLength(input);
                        items = [];
                        for (let i = 0; i < length; i++) {
                            items.push(java.lang.reflect.Array.get(input, i));
                        }
                    }
                }
            } catch (e) {
                items = null;
            }
        }

        // 如果无法获取材料列表，返回空数组
        if (!items) return materials;

        // 遍历配方中的每个材料
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            // 检查物品是否有效（不为空且不是空气）
            if (item && item.getType && item.getType() !== org.bukkit.Material.AIR) {

                // 获取物品名字（优先使用自定义显示名，否则用类型名）
                let itemName = item.getType().name();
                // 获取物品最大堆叠数（用于后续分批给予）
                let maxStack = 64;

                try {
                    itemName = item.getType().name();
                    maxStack = item.getMaxStackSize();

                    // 如果有自定义显示名，使用显示名
                    if (item.hasItemMeta()) {
                        const itemMeta = item.getItemMeta();
                        if (itemMeta && itemMeta.hasDisplayName()) {
                            const displayName = itemMeta.getDisplayName();
                            if (displayName && displayName.length > 0) {
                                itemName = displayName;
                            }
                        }
                    }
                } catch (metaError) {
                    // 获取Meta失败，使用默认类型名
                    itemName = item.getType().name();
                }

                // 获取配方中该材料的数量
                const amount = item.getAmount();

                // 检查是否已经有相同名字的材料，有则合并数量
                let found = false;
                for (let j = 0; j < materials.length; j++) {
                    if (materials[j].name === itemName) {
                        materials[j].amount += amount; // 累加数量
                        found = true;
                        break;
                    }
                }

                // 如果没有相同名字的材料，添加新材料
                if (!found) {
                    materials.push({
                        item: item.clone(),     // 克隆物品，避免修改原配方
                        name: itemName,         // 物品名字（用于区分）
                        amount: amount,         // 总数量
                        maxStack: maxStack      // 最大堆叠数
                    });
                }
            }
        }

    } catch (e) {
        // 发生错误，返回已收集的材料（可能为空）
    }

    return materials;
}

/* ===== 返还材料给玩家 =====
 * 参数：materials - 材料列表
 *       player - 玩家对象
 * 返回：包含返还种类数和总数量的对象
 */
function giveMaterials(materials, player) {
    if (!materials || materials.length === 0) return false;

    const inventory = player.getInventory();
    const location = player.getLocation();
    const world = location.getWorld();
    let givenCount = 0;  // 返还的材料种类数
    let totalItems = 0;  // 返还的总物品数

    // 遍历每种材料
    for (let i = 0; i < materials.length; i++) {
        const material = materials[i];
        const itemStack = material.item;
        const maxStack = material.maxStack;

        totalItems += material.amount;

        let remaining = material.amount;

        // 分批给予物品（处理超过最大堆叠数的情况）
        while (remaining > 0) {
            // 计算本次给予的数量（不超过最大堆叠数）
            const giveAmount = remaining > maxStack ? maxStack : remaining;
            const giveStack = itemStack.clone();
            giveStack.setAmount(giveAmount);

            // 尝试放入玩家背包
            const leftover = inventory.addItem(giveStack);

            // 如果背包满了，剩余物品掉落在地上
            if (leftover && !leftover.isEmpty()) {
                const values = leftover.values().toArray();
                for (let j = 0; j < values.length; j++) {
                    world.dropItemNaturally(location, values[j]);
                }
            }

            remaining -= giveAmount;
        }

        givenCount++;
    }

    // 返回返还统计信息
    return {
        types: givenCount,
        total: totalItems
    };
}

/* ===== 消耗物品（主手） =====
 * 参数：player - 玩家对象
 * 返回：true表示消耗成功
 */
function consumeItem(player) {
    const inventory = player.getInventory();
    const mainHandItem = inventory.getItemInMainHand();

    if (!mainHandItem || mainHandItem.getType() === org.bukkit.Material.AIR) {
        return false;
    }

    const amount = mainHandItem.getAmount();

    // 如果数量大于1，减少一个；否则移除物品
    if (amount > 1) {
        mainHandItem.setAmount(amount - 1);
    } else {
        inventory.setItemInMainHand(null);
    }

    return true;
}

/* ===== 主处理函数 =====
 * 处理玩家右键使用拆解器的逻辑
 */
function onUse(evt) {
    const player = evt.getPlayer();
    const equipment = player.getEquipment();

    // 获取副手物品（要拆解的粘液物品）
    const offHandItem = equipment.getItem(org.bukkit.inventory.EquipmentSlot.OFF_HAND);

    // 检查副手是否有物品
    if (!offHandItem || offHandItem.getType() === org.bukkit.Material.AIR) {
        player.sendMessage('§c✖ §7副手没有物品！请将需要拆解的粘液物品放在副手。');
        try {
            player.playSound(player.getLocation(), 'block.note_block.bass', 1.0, 0.5);
        } catch (e) { }
        return;
    }

    // 获取Slimefun物品信息
    const info = getSlimefunItemInfo(offHandItem);

    // 检查是否是Slimefun物品
    if (!info) {
        player.sendMessage('§c✖ §7副手物品不是粘液科技物品！');
        try {
            player.playSound(player.getLocation(), 'block.note_block.bass', 1.0, 0.5);
        } catch (e) { }
        return;
    }

    // 检查是否获取到物品ID
    if (!info.id) {
        player.sendMessage('§c✖ §7无法获取物品ID！');
        try {
            player.playSound(player.getLocation(), 'block.note_block.bass', 1.0, 0.5);
        } catch (e) { }
        return;
    }

    // --- 新增代码：获取物品的中文名称 ---
    let chineseName = "未知";
    try {
        const SlimefunItemClass = java.lang.Class.forName('io.github.thebusybiscuit.slimefun4.api.items.SlimefunItem');
        const getByIDMethod = SlimefunItemClass.getMethod('getById', java.lang.String.class);
        const slimefunItem = getByIDMethod.invoke(null, info.id);

        if (slimefunItem) {
            const getItemMethod = SlimefunItemClass.getMethod('getItem');
            const itemStack = getItemMethod.invoke(slimefunItem);

            if (itemStack && itemStack.hasItemMeta()) {
                const displayName = itemStack.getItemMeta().getDisplayName();
                if (displayName) {
                    chineseName = displayName;
                }
            }
        }
    } catch (e) {
        // 获取中文名称失败，保持默认值
        console.error("获取物品中文名称失败:", e.message);
    }
    // --- 新增代码结束 ---

    // 检查副手物品数量是否满足配方产出数量要求
    const offHandAmount = offHandItem.getAmount();
    if (offHandAmount < info.outputAmount) {
        player.sendMessage('§c✖ §7副手物品数量不足!');
        player.sendMessage(`§7该配方需要 ${info.outputAmount} 个物品才能拆解`);
        player.sendMessage(`§7你当前只有 ${offHandAmount} 个`);
        try {
            player.playSound(player.getLocation(), 'block.note_block.bass', 1.0, 0.5);
        } catch (e) { }
        return;
    }

    // 检查是否有合成配方
    if (!info.recipe || !isValidRecipeArray(info.recipe)) {
        player.sendMessage('§c✖ §7该物品没有合成配方！');
        try {
            player.playSound(player.getLocation(), 'block.note_block.bass', 1.0, 0.5);
        } catch (e) { }
        return;
    }

    // --- 功能修改：移除原有的 isCraftingRecipe 检查 ---
    // 不再限制配方类型，任何有配方的物品都可以拆解

    // 从配方中提取材料
    const materials = extractMaterials(info.recipe);

    // 检查是否成功提取到材料
    if (materials.length === 0) {
        player.sendMessage('§c✖ §7无法从配方中提取材料！');
        try {
            player.playSound(player.getLocation(), 'block.note_block.bass', 1.0, 0.5);
        } catch (e) { }
        return;
    }

    // 返还材料给玩家
    const success = giveMaterials(materials, player);

    // 检查返还是否成功
    if (!success) {
        player.sendMessage('§c✖ §7返还材料失败！');
        try {
            player.playSound(player.getLocation(), 'block.note_block.bass', 1.0, 0.5);
        } catch (e) { }
        return;
    }

    // 消耗主手的拆解器
    consumeItem(player);

    // 按配方产出数量消耗副手物品
    const remainingAmount = offHandAmount - info.outputAmount;
    if (remainingAmount > 0) {
        offHandItem.setAmount(remainingAmount);
        equipment.setItem(org.bukkit.inventory.EquipmentSlot.OFF_HAND, offHandItem);
    } else {
        equipment.setItem(org.bukkit.inventory.EquipmentSlot.OFF_HAND, null);
    }

    // 播放成功音效
    try {
        player.playSound(player.getLocation(), 'block.anvil.use', 1.0, 1.0);
        player.playSound(player.getLocation(), 'entity.item.pickup', 0.5, 1.0);
    } catch (e) { }

    // 发送成功消息
    player.sendMessage('§e✦ §l配方拆解成功 §e✦');
    // 修改此行以同时输出ID和中文名称
    player.sendMessage(`§a✓ §f已拆解：§e${info.id}§r §7(§f${chineseName}§7)`);
    player.sendMessage(`§a✓ §f消耗了 §e${info.outputAmount} §f个物品，返还了 §e${materials.length} §f种材料`);
    player.sendMessage('§7消耗了一个配方拆解器');
}

/* ===== 事件绑定 =====
 * 注册插件事件监听器
 */
function onLoad() {
    return {
        // 监听玩家交互事件（右键点击）
        PlayerInteractEvent: function (evt) {
            const action = evt.getAction().name();

            // 只处理右键点击空气或方块
            if (action !== 'RIGHT_CLICK_AIR' && action !== 'RIGHT_CLICK_BLOCK') return;

            // 只处理主手（避免副手也触发）
            if (evt.getHand() !== org.bukkit.inventory.EquipmentSlot.HAND) return;

            // 获取主手物品
            const item = evt.getPlayer().getInventory().getItemInMainHand();

            // 检查物品是否有Meta（显示名称等）
            if (!item || !item.hasItemMeta()) return;

            // 检查是否是拆解器（通过显示名称判断）
            if (item.getItemMeta().getDisplayName() !== DISPLAY_NAME) return;

            // 执行拆解逻辑
            onUse(evt);

            // 取消事件（避免触发其他右键行为，如放置方块）
            evt.setCancelled(true);
        }
    };
}

// 加载时执行
onLoad();