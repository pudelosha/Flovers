import org.junit.Test;
import org.objectweb.asm.*;
import static org.junit.Assert.*;

public class FloversProvisioningLogsFactoryTest {
    @Test public void removesSensitiveLogWritesButKeepsSecurityAndDiagnosticsOutsideSdk() {
        for (String level : new String[]{"v", "d", "i", "w", "e", "wtf", "println"}) {
            final int[] calls = {0, 0};
            ClassVisitor recording = new ClassVisitor(Opcodes.ASM9) {
                @Override public MethodVisitor visitMethod(int a, String n, String d, String s, String[] e) {
                    return new MethodVisitor(Opcodes.ASM9) {
                        @Override public void visitMethodInsn(int op, String owner, String n, String d, boolean itf) {
                            if (owner.equals("android/util/Log")) calls[0]++;
                            if (owner.equals("com/espressif/security/Security1")) calls[1]++;
                        }
                    };
                }
            };
            MethodVisitor method = FloversProvisioningLogsFactory.stripLogWrites(recording).visitMethod(0, "probe", "()V", null, null);
            method.visitMethodInsn(Opcodes.INVOKESTATIC, "android/util/Log", level, "(Ljava/lang/String;Ljava/lang/String;)I", false);
            method.visitMethodInsn(Opcodes.INVOKESTATIC, "com/espressif/security/Security1", "verify", "()V", false);
            assertEquals(0, calls[0]); assertEquals(1, calls[1]);
        }
    }
    @Test public void preservesNonWritingLogQueries() {
        final int[] calls = {0};
        ClassVisitor next = new ClassVisitor(Opcodes.ASM9) {
            @Override public MethodVisitor visitMethod(int a, String n, String d, String s, String[] e) {
                return new MethodVisitor(Opcodes.ASM9) {
                    @Override public void visitMethodInsn(int op, String o, String n, String d, boolean itf) { calls[0]++; }
                };
            }
        };
        FloversProvisioningLogsFactory.stripLogWrites(next).visitMethod(0, "probe", "()V", null, null)
            .visitMethodInsn(Opcodes.INVOKESTATIC, "android/util/Log", "isLoggable", "(Ljava/lang/String;I)Z", false);
        assertEquals(1, calls[0]);
    }
}
