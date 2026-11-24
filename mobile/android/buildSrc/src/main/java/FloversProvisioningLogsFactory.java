import com.android.build.api.instrumentation.AsmClassVisitorFactory;
import com.android.build.api.instrumentation.ClassContext;
import com.android.build.api.instrumentation.ClassData;
import com.android.build.api.instrumentation.InstrumentationParameters;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.MethodVisitor;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.Type;

/** Official Espressif SDK logs PoP at initSession, even in non-debug APKs.
 * Remove only SDK log writes, keeping provisioning, crypto and error callbacks intact.
 */
public abstract class FloversProvisioningLogsFactory implements AsmClassVisitorFactory<InstrumentationParameters.None> {
    @Override public boolean isInstrumentable(ClassData data) {
        return data.getClassName().startsWith("com.espressif.provisioning.");
    }
    @Override public ClassVisitor createClassVisitor(ClassContext context, ClassVisitor next) {
        return stripLogWrites(next);
    }
    static ClassVisitor stripLogWrites(ClassVisitor next) {
        return new ClassVisitor(Opcodes.ASM9, next) {
            @Override public MethodVisitor visitMethod(int access, String name, String descriptor, String signature, String[] exceptions) {
                return new MethodVisitor(Opcodes.ASM9, super.visitMethod(access, name, descriptor, signature, exceptions)) {
                    @Override public void visitMethodInsn(int opcode, String owner, String name, String descriptor, boolean isInterface) {
                        if (opcode == Opcodes.INVOKESTATIC && owner.equals("android/util/Log") &&
                                java.util.Set.of("v", "d", "i", "w", "e", "wtf", "println").contains(name)) {
                            Type[] arguments = Type.getArgumentTypes(descriptor);
                            for (int i = arguments.length - 1; i >= 0; i--) {
                                super.visitInsn(arguments[i].getSize() == 2 ? Opcodes.POP2 : Opcodes.POP);
                            }
                            // All Android Log write overloads return int. Fail closed if that changes.
                            if (!Type.getReturnType(descriptor).equals(Type.INT_TYPE)) throw new IllegalStateException("Unknown Log signature");
                            super.visitInsn(Opcodes.ICONST_0);
                        } else super.visitMethodInsn(opcode, owner, name, descriptor, isInterface);
                    }
                };
            }
        };
    }
}
